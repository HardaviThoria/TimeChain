// SPDX-License-Identifier: MIT
pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract TrustID is ERC721Token, Ownable {
    struct Resume {
        string applicantName;
        string resumeHash;
        string employerName;
    }

    struct InstitutionRequest {
        uint256 tokenId;
        string institutionName;
        bool requested;
    }

    struct EmployerRequest {
        uint256 tokenId;
        string employerName;
        bool requested;
    }

    struct Rejection {
        bool isRejected;
        string reason;
        address rejectedBy;
        uint256 rejectedAt;
        string rejectedByRole; // "department" or "payroll"
    }

    struct AuditTrail {
        uint256 submittedAt;
        address submittedBy;
        uint256 departmentVerifiedAt;
        address departmentVerifiedBy;
        uint256 payrollVerifiedAt;
        address payrollVerifiedBy;
        uint256 departmentRejectedAt;
        address departmentRejectedBy;
        string departmentRejectionReason;
        uint256 payrollRejectedAt;
        address payrollRejectedBy;
        string payrollRejectionReason;
    }

    mapping(address => Resume) public resumes;
    mapping(address => bool) public employers;
    mapping(address => bool) public institutions;
    mapping(uint256 => InstitutionRequest) public institutionRequests;
    mapping(uint256 => EmployerRequest) public employerRequests;
    mapping(uint256 => bool) public employerVerified;
    mapping(address => string) public institutionNames;
    mapping(address => string) public employerNames;
    mapping(uint256 => bool) public institutionVerified;
    // Store employee data per tokenId to prevent overwriting
    mapping(uint256 => string) public tokenEmployeeNames;
    mapping(uint256 => string) public tokenResumeHashes;
    mapping(uint256 => string) public tokenDepartmentNames;
    
    // Rejection tracking per tokenId
    mapping(uint256 => Rejection) public departmentRejections;
    mapping(uint256 => Rejection) public payrollRejections;
    
    // Audit trail per tokenId
    mapping(uint256 => AuditTrail) public auditTrails;

    uint256 public tokenCounter;

    event EmployerRegistered(address indexed employer);
    event InstitutionRegistered(address indexed institution);
    event ResumeUploaded(address indexed applicant, string resumeHash);
    event NFTMinted(address indexed applicant, uint256 tokenId, string employerName);
    event InstitutionVerificationRequested(uint256 tokenId, string institutionName, address indexed employer, string employerName);
    event EmployerVerificationRequested(uint256 tokenId, string employerName, address indexed institution, string institutionName);
    event ResumeVerifiedByEmployer(uint256 tokenId, address indexed employer);
    event ResumeVerifiedByInstitution(uint256 tokenId, address indexed institution);
    event InstitutionApprovalUpdated(uint256 tokenId, address institution);
    event EmployerApprovalUpdated(uint256 tokenId, address employer);
    event TimesheetRejectedByDepartment(uint256 indexed tokenId, address indexed rejectedBy, string reason, uint256 timestamp);
    event TimesheetRejectedByPayroll(uint256 indexed tokenId, address indexed rejectedBy, string reason, uint256 timestamp);

    function TrustID() public ERC721Token("Digital Identity Verification NFT", "DIVNFT") {
        tokenCounter = 0;
    }

    function registerEmployer(address employer, string name) public onlyOwner {
        require(employer != address(0));
        require(bytes(name).length > 0);
        employers[employer] = true;
        employerNames[employer] = name;
        emit EmployerRegistered(employer);
    }

    function registerInstitution(address institution, string name) public onlyOwner {
        require(institution != address(0));
        require(bytes(name).length > 0);
        institutions[institution] = true;
        institutionNames[institution] = name;
        emit InstitutionRegistered(institution);
    }

    function getInstitutionName(address institution) public view returns (string) {
        require(institutions[institution]);
        return institutionNames[institution];
    }

    function getEmployerName(address employer) public view returns (string) {
        require(employers[employer]);
        return employerNames[employer];
    }

    function uploadResume(string applicantName, string hash, string employerName) public {
        require(bytes(applicantName).length > 0);
        require(bytes(hash).length > 0);
        require(bytes(employerName).length > 0);

        resumes[msg.sender] = Resume(applicantName, hash, employerName);
        emit ResumeUploaded(msg.sender, hash);

        uint256 tokenId = tokenCounter;
        // Store employee data per tokenId to prevent overwriting when same employee uploads multiple timesheets
        tokenEmployeeNames[tokenId] = applicantName;
        tokenResumeHashes[tokenId] = hash;
        tokenDepartmentNames[tokenId] = employerName;
        
        // Initialize audit trail with submission timestamp
        auditTrails[tokenId] = AuditTrail({
            submittedAt: now,
            submittedBy: msg.sender,
            departmentVerifiedAt: 0,
            departmentVerifiedBy: address(0),
            payrollVerifiedAt: 0,
            payrollVerifiedBy: address(0),
            departmentRejectedAt: 0,
            departmentRejectedBy: address(0),
            departmentRejectionReason: "",
            payrollRejectedAt: 0,
            payrollRejectedBy: address(0),
            payrollRejectionReason: ""
        });
        
        _mint(msg.sender, tokenId);
        emit NFTMinted(msg.sender, tokenId, employerName);
        tokenCounter++;
    }

    function requestVerificationByInstitution(uint256 tokenId, string institutionName, string employerName) public {
        require(employers[msg.sender]);
        require(ownerOf(tokenId) != address(0));
        require(bytes(institutionName).length > 0);
        require(bytes(employerName).length > 0);

        institutionRequests[tokenId] = InstitutionRequest({
            tokenId: tokenId,
            institutionName: institutionName,
            requested: true
        });

        emit InstitutionVerificationRequested(tokenId, institutionName, msg.sender, employerName);
    }

    function requestVerificationByEmployer(uint256 tokenId, string employerName, string institutionName) public {
        require(institutions[msg.sender]);
        require(ownerOf(tokenId) != address(0));
        require(bytes(employerName).length > 0);
        require(bytes(institutionName).length > 0);

        employerRequests[tokenId] = EmployerRequest({
            tokenId: tokenId,
            employerName: employerName,
            requested: true
        });

        emit EmployerVerificationRequested(tokenId, employerName, msg.sender, institutionName);
    }

    function getEmployerRequest(uint256 tokenId) public view returns (string, bool) {
        EmployerRequest memory request = employerRequests[tokenId];
        return (request.employerName, request.requested);
    }

    function verifyByInstitution(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0));
        require(institutions[msg.sender]);
        require(!departmentRejections[tokenId].isRejected, "Timesheet has been rejected by department");
        // REMOVED: require(institutionRequests[tokenId].requested);
        // REMOVED: require(bytes(institutionRequests[tokenId].institutionName).length > 0);
        // Now Department (institution) can verify without needing a request first!

        institutionVerified[tokenId] = true;
        
        // Update audit trail
        auditTrails[tokenId].departmentVerifiedAt = now;
        auditTrails[tokenId].departmentVerifiedBy = msg.sender;
        
        emit ResumeVerifiedByInstitution(tokenId, msg.sender);
        emit InstitutionApprovalUpdated(tokenId, msg.sender);
    }

    function verifyByEmployer(uint256 tokenId) public {
        require(employers[msg.sender]);
        require(ownerOf(tokenId) != address(0));
        require(institutionVerified[tokenId]);  // Department (institution) must verify first!
        require(!payrollRejections[tokenId].isRejected, "Timesheet has been rejected by payroll");

        employerVerified[tokenId] = true;
        
        // Update audit trail
        auditTrails[tokenId].payrollVerifiedAt = now;
        auditTrails[tokenId].payrollVerifiedBy = msg.sender;
        
        emit ResumeVerifiedByEmployer(tokenId, msg.sender);
        emit EmployerApprovalUpdated(tokenId, msg.sender);
    }

    function getResume(address applicant) public view returns (string, string, string) {
        Resume memory resume = resumes[applicant];
        return (resume.applicantName, resume.resumeHash, resume.employerName);
    }

    function isVerifiedByEmployer(uint256 tokenId) public view returns (bool) {
        return employerVerified[tokenId];
    }

    function isVerifiedByInstitution(uint256 tokenId) public view returns (bool) {
        return institutionVerified[tokenId];
    }

    function getInstitutionRequest(uint256 tokenId) public view returns (string, bool) {
        InstitutionRequest memory request = institutionRequests[tokenId];
        return (request.institutionName, request.requested);
    }

    // Get employee data by tokenId (prevents overwriting issue)
    function getResumeByTokenId(uint256 tokenId) public view returns (string, string, string) {
        return (tokenEmployeeNames[tokenId], tokenResumeHashes[tokenId], tokenDepartmentNames[tokenId]);
    }

    // Reject timesheet by Department
    function rejectByDepartment(uint256 tokenId, string reason) public {
        require(ownerOf(tokenId) != address(0));
        require(institutions[msg.sender]);
        require(!institutionVerified[tokenId], "Cannot reject already verified timesheet");
        require(bytes(reason).length > 0, "Rejection reason is required");

        departmentRejections[tokenId] = Rejection({
            isRejected: true,
            reason: reason,
            rejectedBy: msg.sender,
            rejectedAt: now,
            rejectedByRole: "department"
        });

        // Update audit trail
        auditTrails[tokenId].departmentRejectedAt = now;
        auditTrails[tokenId].departmentRejectedBy = msg.sender;
        auditTrails[tokenId].departmentRejectionReason = reason;

        emit TimesheetRejectedByDepartment(tokenId, msg.sender, reason, now);
    }

    // Reject timesheet by Payroll
    function rejectByPayroll(uint256 tokenId, string reason) public {
        require(ownerOf(tokenId) != address(0));
        require(employers[msg.sender]);
        require(institutionVerified[tokenId], "Department must verify first");
        require(!employerVerified[tokenId], "Cannot reject already verified timesheet");
        require(bytes(reason).length > 0, "Rejection reason is required");

        payrollRejections[tokenId] = Rejection({
            isRejected: true,
            reason: reason,
            rejectedBy: msg.sender,
            rejectedAt: now,
            rejectedByRole: "payroll"
        });

        // Update audit trail
        auditTrails[tokenId].payrollRejectedAt = now;
        auditTrails[tokenId].payrollRejectedBy = msg.sender;
        auditTrails[tokenId].payrollRejectionReason = reason;

        emit TimesheetRejectedByPayroll(tokenId, msg.sender, reason, now);
    }

    // Get rejection status
    function getDepartmentRejection(uint256 tokenId) public view returns (bool, string, address, uint256) {
        Rejection memory rejection = departmentRejections[tokenId];
        return (rejection.isRejected, rejection.reason, rejection.rejectedBy, rejection.rejectedAt);
    }

    function getPayrollRejection(uint256 tokenId) public view returns (bool, string, address, uint256) {
        Rejection memory rejection = payrollRejections[tokenId];
        return (rejection.isRejected, rejection.reason, rejection.rejectedBy, rejection.rejectedAt);
    }

    // Get complete audit trail
    function getAuditTrail(uint256 tokenId) public view returns (
        uint256 submittedAt,
        address submittedBy,
        uint256 departmentVerifiedAt,
        address departmentVerifiedBy,
        uint256 payrollVerifiedAt,
        address payrollVerifiedBy,
        uint256 departmentRejectedAt,
        address departmentRejectedBy,
        string departmentRejectionReason,
        uint256 payrollRejectedAt,
        address payrollRejectedBy,
        string payrollRejectionReason
    ) {
        AuditTrail memory trail = auditTrails[tokenId];
        return (
            trail.submittedAt,
            trail.submittedBy,
            trail.departmentVerifiedAt,
            trail.departmentVerifiedBy,
            trail.payrollVerifiedAt,
            trail.payrollVerifiedBy,
            trail.departmentRejectedAt,
            trail.departmentRejectedBy,
            trail.departmentRejectionReason,
            trail.payrollRejectedAt,
            trail.payrollRejectedBy,
            trail.payrollRejectionReason
        );
    }
}
