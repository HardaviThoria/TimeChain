"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import {
  Briefcase,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  User,
  LogOut,
  ChevronRight,
  Shield,
  Moon,
  Sun,
  List,
  ChevronDown,
  Clock,
} from "react-feather"
import "./EmployeePortal.css"

const EmployeePortal = ({ contract, accounts, web3, handleLogout }) => {
  const [employeeName, setEmployeeName] = useState("")
  const [resumeHash, setResumeHash] = useState("")
  const [uploading, setUploading] = useState(false)
  const [nfts, setNFTs] = useState([])
  const [verificationStatuses, setVerificationStatuses] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [activeTab, setActiveTab] = useState("departments")
  const [auditTrails, setAuditTrails] = useState({})
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true')
  const [expandedItems, setExpandedItems] = useState({})

  const PINATA_API_KEY = "6ead6cca462a961c7273"
  const PINATA_SECRET_API_KEY = "744cf8fe8bdeaef78027a3b96bb4d5876199a5520f4430280280c3dfae3b4c5b"

  const fetchRegisteredDepartments = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/departments")
      if (response.status === 200) {
        setDepartments(response.data.departments)
        console.log("Registered Departments:", response.data.departments)
      } else {
        console.error("Failed to fetch departments:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching departments:", error.message)
    }
  }, [])

  const uploadToPinata = async (file) => {
    const formData = new FormData()
    formData.append("file", file)

    const metadata = JSON.stringify({ name: file.name })
    formData.append("pinataMetadata", metadata)

    try {
      setUploading(true)
      console.log("Starting Pinata upload...")
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      })
      console.log("Pinata Response:", response.data)
      setUploading(false)
      return response.data.IpfsHash
    } catch (error) {
      setUploading(false)
      console.error("Pinata Error:", error.response?.data || error.message)
      throw new Error("Failed to upload file to IPFS")
    }
  }

  const fetchVerificationStatus = useCallback(
    async (mintedNFTs) => {
      try {
        const statuses = await Promise.all(
          mintedNFTs.map(async (nft) => {
            // Department verification (institution in contract)
            const departmentVerified = await contract.methods.isVerifiedByInstitution(nft.tokenId).call()

            // Payroll request (employer in contract)
            const payrollRequest = await contract.methods.getEmployerRequest(nft.tokenId).call()

            // Payroll verification (employer in contract)
            const payrollVerified = await contract.methods.isVerifiedByEmployer(nft.tokenId).call()

            const payrollName = payrollRequest[0] || ""
            const payrollRequested = payrollRequest[1] || false

            // Fetch rejection data (with error handling)
            let isRejectedByDept = false
            let deptRejectionReason = ""
            let isRejectedByPayroll = false
            let payrollRejectionReason = ""
            try {
              const deptRejection = await contract.methods.getDepartmentRejection(nft.tokenId).call()
              // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
              isRejectedByDept = deptRejection[0] === true || deptRejection[0] === "true"
              deptRejectionReason = deptRejection[1] || ""
            } catch (error) {
              console.log(`Warning: Could not fetch department rejection for token ${nft.tokenId}:`, error.message)
            }
            
            try {
              const payrollRejection = await contract.methods.getPayrollRejection(nft.tokenId).call()
              // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
              isRejectedByPayroll = payrollRejection[0] === true || payrollRejection[0] === "true"
              payrollRejectionReason = payrollRejection[1] || ""
            } catch (error) {
              console.log(`Warning: Could not fetch payroll rejection for token ${nft.tokenId}:`, error.message)
            }

            // Fetch audit trail (with error handling)
            let auditTrail = {
              submittedAt: 0,
              submittedBy: "0x0",
              departmentVerifiedAt: 0,
              departmentVerifiedBy: "0x0",
              payrollVerifiedAt: 0,
              payrollVerifiedBy: "0x0",
              departmentRejectedAt: 0,
              departmentRejectedBy: "0x0",
              departmentRejectionReason: "",
              payrollRejectedAt: 0,
              payrollRejectedBy: "0x0",
              payrollRejectionReason: "",
            }
            try {
              const trail = await contract.methods.getAuditTrail(nft.tokenId).call()
              // Contract returns object with numeric keys
              auditTrail = {
                submittedAt: trail[0] || 0,
                submittedBy: trail[1] || "0x0",
                departmentVerifiedAt: trail[2] || 0,
                departmentVerifiedBy: trail[3] || "0x0",
                payrollVerifiedAt: trail[4] || 0,
                payrollVerifiedBy: trail[5] || "0x0",
                departmentRejectedAt: trail[6] || 0,
                departmentRejectedBy: trail[7] || "0x0",
                departmentRejectionReason: trail[8] || "",
                payrollRejectedAt: trail[9] || 0,
                payrollRejectedBy: trail[10] || "0x0",
                payrollRejectionReason: trail[11] || "",
              }
            } catch (error) {
              console.log(`Warning: Could not fetch audit trail for token ${nft.tokenId}:`, error.message)
            }

            return {
              tokenId: nft.tokenId,
              departmentName: nft.departmentName,
              departmentVerified: departmentVerified,
              payrollVerified: payrollVerified,
              payrollName: payrollName || "N/A",
              payrollStatus: payrollVerified
                ? "Approved"
                : payrollRequested
                  ? "Requested"
                  : "Not Requested",
              isRejectedByDepartment: isRejectedByDept,
              departmentRejectionReason: deptRejectionReason || "",
              isRejectedByPayroll: isRejectedByPayroll,
              payrollRejectionReason: payrollRejectionReason || "",
              auditTrail: auditTrail
            }
          }),
        )

        setVerificationStatuses(statuses)
        console.log("User-specific verification statuses:", statuses)
        
        // Store audit trails separately
        const trails = {}
        statuses.forEach(status => {
          trails[status.tokenId] = status.auditTrail
        })
        setAuditTrails(trails)
      } catch (error) {
        console.error("Error fetching verification statuses:", error.message)
      }
    },
    [contract],
  )

  const fetchNFTs = useCallback(async () => {
    if (!contract || accounts.length === 0) {
      console.warn("Contract or accounts not initialized.")
      return
    }

    try {
      console.log("Fetching NFTMinted events...")
      const pastEvents = await contract.getPastEvents("NFTMinted", {
        fromBlock: 0,
        toBlock: "latest",
      })

      const mintedNFTs = pastEvents
        .filter((event) => {
          const applicant = event.returnValues.applicant || event.returnValues[0]
          return applicant && applicant.toLowerCase() === accounts[0].toLowerCase()
        })
        .map((event) => {
          const returnValues = event.returnValues
          return {
            tokenId: Number.parseInt(returnValues.tokenId || returnValues[1], 10),
            departmentName: returnValues.employerName || returnValues[2],
          }
        })

      console.log("Filtered NFTs for current user:", mintedNFTs)
      setNFTs(mintedNFTs)

      fetchVerificationStatus(mintedNFTs)
    } catch (error) {
      console.error("Error fetching NFTs:", error.message)
    }
  }, [contract, accounts, fetchVerificationStatus])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', newMode.toString())
    document.documentElement.classList.toggle('dark-mode', newMode)
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [darkMode])

  useEffect(() => {
    if (contract && accounts.length > 0) {
      fetchNFTs()
      fetchRegisteredDepartments()
    }
  }, [contract, accounts, fetchNFTs, fetchRegisteredDepartments])

  const uploadResume = async (e) => {
    e.preventDefault()
    console.log("uploadResume triggered")

    if (!resumeHash || !employeeName || !selectedDepartment) {
      alert("Please provide a resume, employee name, and select an department.")
      return
    }

    console.log("Parameters:", { employeeName, resumeHash, selectedDepartment })

    try {
      const txReceipt = await contract.methods
        .uploadResume(employeeName, resumeHash, selectedDepartment)
        .send({ from: accounts[0] })

      console.log("Transaction Receipt:", txReceipt)

      const nftMintedEvent = txReceipt.events.NFTMinted
      if (nftMintedEvent) {
        const returnValues = nftMintedEvent.returnValues
        // Event can use numeric indices or named properties
        const tokenId = returnValues.tokenId || returnValues[1]
        const applicant = returnValues.applicant || returnValues[0]
        const departmentName = returnValues.employerName || returnValues[2]
        
        console.log("NFT Minted Event:", { tokenId, applicant, departmentName, returnValues })

        if (applicant && applicant.toLowerCase() === accounts[0].toLowerCase()) {
          const newNFT = {
            tokenId: Number.parseInt(tokenId, 10),
            departmentName: departmentName || selectedDepartment,
          }
          setNFTs((prevNFTs) => [...prevNFTs, newNFT])
          alert(`NFT Minted with Token ID: ${tokenId}`)
          setSelectedDepartment("")
          // Refresh NFTs list
          fetchNFTs()
        } else {
          console.warn("NFT minted for a different account:", applicant)
          setSelectedDepartment("")
        }
      } else {
        console.error("No NFTMinted event found in transaction receipt.")
      }
    } catch (error) {
      console.error("Blockchain Error:", error.message)
      alert("Failed to upload resume to the blockchain.")
    }
  }

  return (
    <div className="portal-wrapper">
      <div className="portal-container">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TimeChain</h1>
            <span className="portal-subtitle">Employee Portal</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              onClick={toggleDarkMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="portal-tabs">
          <button
            className={`tab-button ${activeTab === "departments" ? "active" : ""}`}
            onClick={() => setActiveTab("departments")}
          >
            <Briefcase size={18} />
            <span>Departments</span>
          </button>
          <button className={`tab-button ${activeTab === "nfts" ? "active" : ""}`} onClick={() => setActiveTab("nfts")}>
            <Shield size={18} />
            <span>Your NFTs</span>
          </button>
          <button
            className={`tab-button ${activeTab === "verification" ? "active" : ""}`}
            onClick={() => setActiveTab("verification")}
          >
            <Award size={18} />
            <span>Verification</span>
          </button>
        </div>

        <div className="portal-content">
          {activeTab === "departments" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Registered Departments</h2>
                <p>Submit your timesheet to any department. Multiple employees can submit to the same department.</p>
              </div>

              <div className="department-grid">
                {departments.map((department, index) => {
                  const isApplied = nfts.some(
                    (nft) => nft.departmentName.toLowerCase() === department.username.toLowerCase(),
                  )

                  const departmentStatus = verificationStatuses.find(
                    (v) => v.departmentName.toLowerCase() === department.username.toLowerCase(),
                  )

                  // Count how many timesheets this employee has submitted to this department
                  const timesheetCount = nfts.filter(
                    (nft) => nft.departmentName.toLowerCase() === department.username.toLowerCase(),
                  ).length

                  return (
                    <div key={index} className="department-card">
                      <div className="department-icon">
                        <Briefcase size={24} />
                      </div>
                      <div className="department-info">
                        <h3>{department.username}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                          {/* Status badge - show if there are existing submissions */}
                          {timesheetCount > 0 && (
                            departmentStatus?.isRejectedByDepartment || departmentStatus?.isRejectedByPayroll ? (
                              <div className="status-badge rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                <XCircle size={16} />
                                <span>
                                  {departmentStatus?.isRejectedByDepartment ? 'Rejected by Department' : 'Rejected by Payroll'}
                                </span>
                              </div>
                            ) : departmentStatus?.departmentVerified && departmentStatus?.payrollVerified ? (
                              <div className="status-badge verified">
                                <CheckCircle size={16} />
                                <span>Verified by department & payroll</span>
                              </div>
                            ) : (
                              <div className="status-badge pending">
                                <AlertTriangle size={16} />
                                <span>Awaiting verification</span>
                              </div>
                            )
                          )}
                          {/* Always show Apply button - employees can submit multiple timesheets */}
                          <button 
                            className="apply-button" 
                            onClick={() => setSelectedDepartment(department.username)}
                            style={{ marginTop: timesheetCount > 0 ? '0.5rem' : '0' }}
                          >
                            {timesheetCount > 0 ? 'Submit Another Timesheet' : 'Apply Now'}
                            <ChevronRight size={16} />
                          </button>
                          {timesheetCount > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                              {timesheetCount} timesheet{timesheetCount !== 1 ? 's' : ''} submitted
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedDepartment && (
                <div className="application-form">
                  <div className="form-header">
                    <h3>Apply to {selectedDepartment}</h3>
                    <button className="close-button" onClick={() => setSelectedDepartment("")}>
                      ×
                    </button>
                  </div>
                  <form onSubmit={uploadResume}>
                    <div className="form-group">
                      <label>
                        <User size={16} />
                        <span>Full Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        <FileText size={16} />
                        <span>Resume</span>
                      </label>
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          id="resume-upload"
                          onChange={async (e) => {
                            const file = e.target.files[0]
                            if (file) {
                              try {
                                const hash = await uploadToPinata(file)
                                setResumeHash(hash)
                              } catch (error) {
                                console.error("Error uploading file:", error.message)
                              }
                            }
                          }}
                          required
                        />
                        <label htmlFor="resume-upload" className="file-input-label">
                          <Upload size={16} />
                          <span>{resumeHash ? "File Selected" : "Choose File"}</span>
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="submit-button" disabled={!resumeHash || uploading}>
                      {uploading ? (
                        <>
                          <div className="spinner"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === "nfts" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Your NFT Credentials</h2>
                <p>View your credential tokens</p>
              </div>

              {nfts.length > 0 ? (
                <div className="nft-list">
                  {nfts.map((nft, index) => (
                    <div key={index} className="nft-card">
                      <div className="nft-icon">
                        <Shield size={24} />
                      </div>
                      <div className="nft-info">
                        <h3>Token ID: {nft.tokenId}</h3>
                        <p>Department: {nft.departmentName}</p>

                        {verificationStatuses.find((status) => status.tokenId === nft.tokenId)?.departmentVerified && (
                          <div className="nft-badge">
                            <CheckCircle size={14} />
                            <span>Department Verified</span>
                          </div>
                        )}

                        {verificationStatuses.find((status) => status.tokenId === nft.tokenId)?.payrollVerified && (
                          <div className="nft-badge">
                            <CheckCircle size={14} />
                            <span>Payroll Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Shield size={48} />
                  <h3>No NFTs Found</h3>
                  <p>Apply to departments to receive credential NFTs</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "verification" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Verification Status</h2>
                <p>Track the verification status of your credentials</p>
              </div>

              {verificationStatuses.length > 0 ? (
                <div className="verification-table">
                  <div className="table-header">
                    <div className="table-cell">NFT ID</div>
                    <div className="table-cell">Department</div>
                    <div className="table-cell">Department Status</div>
                    <div className="table-cell">Payroll</div>
                    <div className="table-cell">Payroll Status</div>
                  </div>

                  {verificationStatuses.map((status, index) => (
                    <div key={index} className="table-row">
                      <div className="table-cell">{status.tokenId}</div>
                      <div className="table-cell">{status.departmentName}</div>
                      <div className="table-cell">
                        {status.isRejectedByDepartment ? (
                          <div className="status-pill rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected</span>
                          </div>
                        ) : status.departmentVerified ? (
                          <div className="status-pill verified">
                            <CheckCircle size={14} />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="status-pill pending">
                            <XCircle size={14} />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                      <div className="table-cell">{status.payrollName}</div>
                      <div className="table-cell">
                        {status.isRejectedByPayroll ? (
                          <div className="status-pill rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected</span>
                          </div>
                        ) : status.payrollStatus === "Approved" ? (
                          <div className="status-pill verified">
                            <CheckCircle size={14} />
                            <span>Approved</span>
                          </div>
                        ) : status.payrollStatus === "Requested" ? (
                          <div className="status-pill pending">
                            <AlertTriangle size={14} />
                            <span>Requested</span>
                          </div>
                        ) : (
                          <div className="status-pill not-started">
                            <XCircle size={14} />
                            <span>Not Requested</span>
                          </div>
                        )}
                      </div>
                      {/* Audit Trail Toggle */}
                      {auditTrails[status.tokenId] && (
                        <div style={{ gridColumn: '1 / -1', padding: '0.75rem', borderTop: '1px solid var(--slate-200)' }}>
                          {expandedItems[`audit-${status.tokenId}`] ? (
                            <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setExpandedItems(prev => ({ ...prev, [`audit-${status.tokenId}`]: false }))}>
                            <List size={16} />
                            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Audit Trail</h4>
                            <ChevronDown size={16} className="rotated" />
                          </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', paddingLeft: '1.5rem' }}>
                                {auditTrails[status.tokenId].submittedAt > 0 && (
                                  <div className="audit-item">
                                    <Clock size={14} />
                                    <span><strong>Submitted:</strong> {new Date(Number(auditTrails[status.tokenId].submittedAt) * 1000).toLocaleString()}</span>
                                  </div>
                                )}
                                {auditTrails[status.tokenId].departmentVerifiedAt > 0 && (
                                  <div className="audit-item verified">
                                    <CheckCircle size={14} />
                                    <span><strong>Department Verified:</strong> {new Date(Number(auditTrails[status.tokenId].departmentVerifiedAt) * 1000).toLocaleString()}</span>
                                  </div>
                                )}
                                {auditTrails[status.tokenId].departmentRejectedAt > 0 && (
                                  <div className="audit-item rejected">
                                    <XCircle size={14} />
                                    <span><strong>Department Rejected:</strong> {new Date(Number(auditTrails[status.tokenId].departmentRejectedAt) * 1000).toLocaleString()}</span>
                                    <p style={{ marginLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                      Reason: {auditTrails[status.tokenId].departmentRejectionReason}
                                    </p>
                                  </div>
                                )}
                                {auditTrails[status.tokenId].payrollVerifiedAt > 0 && (
                                  <div className="audit-item verified">
                                    <CheckCircle size={14} />
                                    <span><strong>Payroll Verified:</strong> {new Date(Number(auditTrails[status.tokenId].payrollVerifiedAt) * 1000).toLocaleString()}</span>
                                  </div>
                                )}
                                {auditTrails[status.tokenId].payrollRejectedAt > 0 && (
                                  <div className="audit-item rejected">
                                    <XCircle size={14} />
                                    <span><strong>Payroll Rejected:</strong> {new Date(Number(auditTrails[status.tokenId].payrollRejectedAt) * 1000).toLocaleString()}</span>
                                    <p style={{ marginLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                      Reason: {auditTrails[status.tokenId].payrollRejectionReason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--emerald-600)', 
                                cursor: 'pointer', 
                                fontSize: '0.875rem', 
                                fontWeight: '600', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                margin: '0 auto',
                                padding: '0.5rem'
                              }} 
                              onClick={() => setExpandedItems(prev => ({ ...prev, [`audit-${status.tokenId}`]: true }))}
                            >
                              <List size={14} />
                              <span>View Audit Trail</span>
                              <ChevronDown size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Award size={48} />
                  <h3>No Verifications Yet</h3>
                  <p>Apply to departments to start the verification process</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeePortal
