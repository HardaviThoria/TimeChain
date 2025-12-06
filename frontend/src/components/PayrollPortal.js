"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  LogOut,
  FileText,
  CheckCircle,
  Award,
  ExternalLink,
  ChevronDown,
  Info,
  Shield,
  User,
  Briefcase,
  XCircle,
  Moon,
  Sun,
  List,
  Clock,
} from "react-feather"
import "./PayrollPortal.css"

const PayrollPortal = ({ contract, accounts, handleLogout }) => {
  const [isRegistered, setIsRegistered] = useState(false)
  const [payrollName, setPayrollDepartmentName] = useState("")
  const [requests, setRequests] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState({})
  const [processingTokens, setProcessingTokens] = useState({})
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [showRejectionModal, setShowRejectionModal] = useState({})
  const [auditTrails, setAuditTrails] = useState({})
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true')

  // Toggle resume card expanded state
  const toggleExpanded = (tokenId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }))
  }

  // Check if the current account is a registered payroll
  const checkPayrollDepartmentRegistration = useCallback(async () => {
    try {
      console.log("Checking payroll registration for address:", accounts[0])
      const registered = await contract.methods.employers(accounts[0]).call()
      console.log("Registration status:", registered)
      setIsRegistered(registered)
      if (!registered) {
        console.warn("Account is not registered as payroll. Please register first.")
      }
    } catch (error) {
      console.error("Error checking payroll registration:", error.message)
      setIsRegistered(false)
    }
  }, [contract, accounts])

  // Get payroll name from smart contract
  const fetchPayrollDepartmentName = useCallback(async () => {
    try {
      const name = await contract.methods.getEmployerName(accounts[0]).call()
      setPayrollDepartmentName(name.toLowerCase())
    } catch (error) {
      console.error("Error fetching payroll name:", error.message)
    }
  }, [contract, accounts])

  // Fetch all payroll verification requests directed to this payroll
  const fetchRequests = useCallback(async () => {
    try {
      console.log("📋 Fetching verification requests for payroll:", payrollName)
      const events = await contract.getPastEvents("EmployerVerificationRequested", {
        fromBlock: 0,
        toBlock: "latest",
      })

      console.log(`📋 Found ${events.length} verification request event(s)`)
      
      // Filter by payroll name OR by address (in case name doesn't match)
      const filtered = events
        .filter((event) => {
          const requestPayrollName = (event.returnValues.employerName || "").toLowerCase()
          const currentPayrollName = (payrollName || "").toLowerCase()
          const matches = requestPayrollName === currentPayrollName
          
          console.log(`🔍 Request for Token ${event.returnValues.tokenId}:`)
          console.log(`   - Request Payroll Name: "${requestPayrollName}"`)
          console.log(`   - Current Payroll Name: "${currentPayrollName}"`)
          console.log(`   - Match: ${matches ? "✅ YES" : "❌ NO"}`)
          
          return matches
        })
        .map((event) => ({
          tokenId: event.returnValues.tokenId,
          department: event.returnValues.institution,
          departmentName: event.returnValues.institutionName,
        }))

      console.log(`✅ Filtered requests: ${filtered.length} request(s) for payroll "${payrollName}"`)
      if (filtered.length === 0 && events.length > 0) {
        console.log("⚠️ No requests match this payroll name!")
        console.log("Available requests:", events.map(e => ({ 
          tokenId: e.returnValues.tokenId, 
          payrollName: e.returnValues.employerName 
        })))
        console.log(`💡 Tip: The request was made to a different payroll name. Either:`)
        console.log(`   1. Log in as the payroll that matches the request (e.g., "p1")`)
        console.log(`   2. Or make a new request from Department Portal to "${payrollName}"`)
      }

      setRequests(filtered)
    } catch (error) {
      console.error("Error fetching verification requests:", error.message)
    }
  }, [contract, payrollName])

  // Get resume details for all requested token IDs
  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true)
      const detailedResumes = await Promise.all(
        requests.map(async (req) => {
          // Use getResumeByTokenId to get data specific to this tokenId (prevents overwriting issue)
          let result
          try {
            result = await contract.methods.getResumeByTokenId(req.tokenId).call()
          } catch (error) {
            // Fallback: get employee address from token owner, then get resume
            console.log("Falling back to old method for tokenId:", req.tokenId)
            try {
              const owner = await contract.methods.ownerOf(req.tokenId).call()
              result = await contract.methods.getResume(owner).call()
            } catch (fallbackError) {
              console.error("Error fetching resume:", fallbackError)
              result = ["Unknown", "", ""]
            }
          }

          // Check if this resume is already verified by payroll (employer in contract)
          const isVerified = await contract.methods.isVerifiedByEmployer(req.tokenId).call()
          
          // Also check if department (institution in contract) has verified first
          const isDepartmentVerified = await contract.methods.isVerifiedByInstitution(req.tokenId).call()

          // Fetch rejection data (with error handling)
          let isRejectedByDept = false
          let isRejectedByPayroll = false
          let payrollRejectionReason = ""
          try {
            const deptRejection = await contract.methods.getDepartmentRejection(req.tokenId).call()
            // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
            isRejectedByDept = deptRejection[0] === true || deptRejection[0] === "true"
          } catch (error) {
            console.log(`Warning: Could not fetch department rejection for token ${req.tokenId}:`, error.message)
          }
          
          try {
            const payrollRejection = await contract.methods.getPayrollRejection(req.tokenId).call()
            // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
            isRejectedByPayroll = payrollRejection[0] === true || payrollRejection[0] === "true"
            payrollRejectionReason = payrollRejection[1] || ""
          } catch (error) {
            console.log(`Warning: Could not fetch payroll rejection for token ${req.tokenId}:`, error.message)
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
            const trail = await contract.methods.getAuditTrail(req.tokenId).call()
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
            console.log(`Warning: Could not fetch audit trail for token ${req.tokenId}:`, error.message)
          }

          return {
            tokenId: req.tokenId,
            employeeName: result[0] || "Unknown",
            resumeHash: result[1] || "",
            departmentName: result[2] || req.departmentName,
            isVerified: isVerified,
            isDepartmentVerified: isDepartmentVerified,
            isRejectedByDepartment: isRejectedByDept,
            isRejectedByPayroll: isRejectedByPayroll,
            payrollRejectionReason: payrollRejectionReason || "",
            auditTrail: auditTrail
          }
        }),
      )
      setResumes(detailedResumes)
      
      // Store audit trails separately for easy access
      const trails = {}
      detailedResumes.forEach(resume => {
        trails[resume.tokenId] = resume.auditTrail
      })
      setAuditTrails(trails)
    } catch (error) {
      console.error("Error fetching resumes:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract, requests])

  const rejectRequest = async (tokenId) => {
    const reason = rejectionReasons[tokenId] || ""
    if (!reason.trim()) {
      alert("Please provide a rejection reason")
      return
    }

    try {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: true }))
      await contract.methods.rejectByPayroll(tokenId, reason).send({ from: accounts[0] })
      
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<XCircle size={18} /> Timesheet with Token ID ${tokenId} rejected`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
      
      setShowRejectionModal(prev => ({ ...prev, [tokenId]: false }))
      setRejectionReasons(prev => ({ ...prev, [tokenId]: "" }))
      fetchResumes()
    } catch (error) {
      console.error("Error rejecting resume:", error.message)
      
      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = "Rejection failed"
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    } finally {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: false }))
    }
  }

  const approveRequest = async (tokenId) => {
    try {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: true }))

      // Payroll verifies using verifyByEmployer (requires department verification first)
      await contract.methods.verifyByEmployer(tokenId).send({ from: accounts[0] })

      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<div class="notification-content"><CheckCircle size={18} /> Timesheet with Token ID ${tokenId} approved by Payroll</div>`
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)

      // Update the local state to reflect the verification
      setResumes((prevResumes) =>
        prevResumes.map((resume) => (resume.tokenId === tokenId ? { ...resume, isVerified: true } : resume)),
      )
    } catch (error) {
      console.error("Error approving resume:", error.message)

      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = `<div class="notification-content">Error approving timesheet</div>`
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    } finally {
      setProcessingTokens((prev) => ({ ...prev, [tokenId]: false }))
    }
  }

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
    const initializePortal = async () => {
      await checkPayrollDepartmentRegistration()
      await fetchPayrollDepartmentName()
      setLoading(false)
    }

    initializePortal()
  }, [checkPayrollDepartmentRegistration, fetchPayrollDepartmentName])

  useEffect(() => {
    if (payrollName) fetchRequests()
  }, [payrollName, fetchRequests])

  useEffect(() => {
    if (requests.length > 0) fetchResumes()
  }, [requests, fetchRequests, fetchResumes])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading portal data...</p>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="not-registered">
        <Info size={48} />
        <h2>Access Restricted</h2>
        <p>You are not a registered payroll on this platform.</p>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
          Current address: {accounts[0]}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
          Please make sure you registered with this exact MetaMask address.
        </p>
        <button 
          onClick={async () => {
            try {
              const status = await contract.methods.employers(accounts[0]).call()
              alert(`Registration status: ${status ? 'Registered' : 'Not Registered'}`)
            } catch (err) {
              alert(`Error: ${err.message}`)
            }
          }} 
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Check Registration Status
        </button>
        <button onClick={handleLogout} className="logout-button" style={{ marginTop: '1rem' }}>
          <LogOut size={18} />
          <span>Return to Login</span>
        </button>
      </div>
    )
  }

  return (
    <div className="portal-wrapper">
      <div className="payroll-portal">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TimeChain</h1>
            <span className="portal-subtitle">Payroll Department Portal</span>
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

        <div className="portal-content">
          <div className="section-header">
            <div>
              <h2>Verification Requests</h2>
              <p>Review and approve timesheet verification requests from multiple departments and employees</p>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{resumes.length}</div>
                <div className="stat-label">Total Requests</div>
              </div>
              <div className="stat">
                <div className="stat-value">{resumes.filter((resume) => resume.isVerified).length}</div>
                <div className="stat-label">Approved</div>
              </div>
              <div className="stat">
                <div className="stat-value">{resumes.filter((resume) => !resume.isVerified).length}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="empty-state">
              <Award size={48} />
              <h3>No Verification Requests</h3>
              <p>You don't have any pending verification requests at this time.</p>
            </div>
          ) : (
            <div className="resume-list">
              {resumes.map((resume) => (
                <React.Fragment key={resume.tokenId}>
                <div className={`resume-card ${expandedItems[resume.tokenId] ? "expanded" : ""}`}>
                  <div className="resume-header" onClick={() => toggleExpanded(resume.tokenId)}>
                    <div className="resume-icon">
                      <FileText size={24} />
                    </div>
                    <div className="resume-title">
                      <h3>{resume.employeeName}</h3>
                      <div className="resume-meta">
                        <span className="token-id">Token ID: {resume.tokenId}</span>
                        <span className="department-name">
                          <Briefcase size={14} />
                          <span>{resume.departmentName}</span>
                        </span>
                        {resume.isVerified && (
                          <span className="verified-badge">
                            <CheckCircle size={14} />
                            <span>Verified</span>
                          </span>
                        )}
                        {resume.isRejectedByPayroll && (
                          <span className="verified-badge rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected by Payroll</span>
                          </span>
                        )}
                        {resume.isRejectedByDepartment && (
                          <span className="verified-badge rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected by Department</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`expand-icon ${expandedItems[resume.tokenId] ? "rotated" : ""}`}
                    />
                  </div>

                  <div className="resume-details">
                    <div className="detail-section">
                      <h4>Employee Information</h4>
                      <div className="detail-row">
                        <div className="detail-label">
                          <User size={16} />
                          <span>Name</span>
                        </div>
                        <div className="detail-value">{resume.employeeName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <Shield size={16} />
                          <span>Token ID</span>
                        </div>
                        <div className="detail-value">{resume.tokenId}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <Briefcase size={16} />
                          <span>Department</span>
                        </div>
                        <div className="detail-value">{resume.departmentName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">
                          <FileText size={16} />
                          <span>Timesheet</span>
                        </div>
                        <div className="detail-value">
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-link"
                          >
                            <span>View Timesheet</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="verification-section">
                      <h4>Verification Status</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                        You can receive verification requests from multiple departments and employees. Each timesheet is processed independently.
                      </p>
                      
                      <div className="detail-row">
                        <div className="detail-label">Department Verification:</div>
                        <div className="detail-value">
                          {resume.isDepartmentVerified ? (
                            <span className="verified-badge department">
                              <CheckCircle size={14} />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="pending-badge">
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {resume.isRejectedByPayroll ? (
                        <div className="verification-status rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                          <XCircle size={18} />
                          <div>
                            <span>Rejected by Payroll</span>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                              Reason: {resume.payrollRejectionReason}
                            </p>
                          </div>
                        </div>
                      ) : resume.isVerified ? (
                        <div className="verification-status verified">
                          <CheckCircle size={18} />
                          <span>Verified by Payroll ({payrollName})</span>
                        </div>
                      ) : (
                        <div className="verification-actions">
                          {!resume.isDepartmentVerified && (
                            <p className="verification-note warning">
                              <Info size={16} />
                              <span>Waiting for Department to verify first.</span>
                            </p>
                          )}
                          {resume.isDepartmentVerified && (
                            <p className="verification-note">
                              <Info size={16} />
                              <span>Please review the timesheet before approving the verification request.</span>
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                            <button
                              className="approve-button"
                              onClick={() => approveRequest(resume.tokenId)}
                              disabled={processingTokens[resume.tokenId] || !resume.isDepartmentVerified}
                            >
                              {processingTokens[resume.tokenId] ? (
                                <>
                                <div className="spinner small"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                <span>Approve Verification</span>
                              </>
                            )}
                          </button>
                            <button
                              className="reject-button"
                              onClick={() => setShowRejectionModal(prev => ({ ...prev, [resume.tokenId]: true }))}
                              disabled={processingTokens[resume.tokenId] || !resume.isDepartmentVerified}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%',
                                padding: '0.75rem',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <XCircle size={18} />
                              <span>Reject Timesheet</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audit Trail Section */}
                    {auditTrails[resume.tokenId] && (
                      <div className="audit-trail-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <List size={16} />
                          <span>Audit Trail</span>
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                          {auditTrails[resume.tokenId].submittedAt > 0 && (
                            <div className="audit-item">
                              <Clock size={14} />
                              <span><strong>Submitted:</strong> {new Date(Number(auditTrails[resume.tokenId].submittedAt) * 1000).toLocaleString()}</span>
                            </div>
                          )}
                          {auditTrails[resume.tokenId].departmentVerifiedAt > 0 && (
                            <div className="audit-item verified">
                              <CheckCircle size={14} />
                              <span><strong>Department Verified:</strong> {new Date(Number(auditTrails[resume.tokenId].departmentVerifiedAt) * 1000).toLocaleString()}</span>
                            </div>
                          )}
                          {auditTrails[resume.tokenId].departmentRejectedAt > 0 && (
                            <div className="audit-item rejected">
                              <XCircle size={14} />
                              <span><strong>Department Rejected:</strong> {new Date(Number(auditTrails[resume.tokenId].departmentRejectedAt) * 1000).toLocaleString()}</span>
                              <p style={{ marginLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                Reason: {auditTrails[resume.tokenId].departmentRejectionReason}
                              </p>
                            </div>
                          )}
                          {auditTrails[resume.tokenId].payrollVerifiedAt > 0 && (
                            <div className="audit-item verified">
                              <CheckCircle size={14} />
                              <span><strong>Payroll Verified:</strong> {new Date(Number(auditTrails[resume.tokenId].payrollVerifiedAt) * 1000).toLocaleString()}</span>
                            </div>
                          )}
                          {auditTrails[resume.tokenId].payrollRejectedAt > 0 && (
                            <div className="audit-item rejected">
                              <XCircle size={14} />
                              <span><strong>Payroll Rejected:</strong> {new Date(Number(auditTrails[resume.tokenId].payrollRejectedAt) * 1000).toLocaleString()}</span>
                              <p style={{ marginLeft: '1.5rem', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                Reason: {auditTrails[resume.tokenId].payrollRejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Modal */}
                {showRejectionModal[resume.tokenId] && (
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10000
                    }}
                    onClick={() => setShowRejectionModal(prev => ({ ...prev, [resume.tokenId]: false }))}
                  >
                    <div 
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
                        Reject Timesheet
                      </h3>
                      <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
                        Please provide a reason for rejecting this timesheet. This will be stored on the blockchain.
                      </p>
                      <textarea
                        value={rejectionReasons[resume.tokenId] || ""}
                        onChange={(e) => setRejectionReasons(prev => ({ ...prev, [resume.tokenId]: e.target.value }))}
                        placeholder="Enter rejection reason..."
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '0.875rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          marginBottom: '1.5rem'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setShowRejectionModal(prev => ({ ...prev, [resume.tokenId]: false }))
                            setRejectionReasons(prev => ({ ...prev, [resume.tokenId]: "" }))
                          }}
                          style={{
                            padding: '0.75rem 1.5rem',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            background: 'white',
                            color: '#64748b',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => rejectRequest(resume.tokenId)}
                          disabled={processingTokens[resume.tokenId]}
                          style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '12px',
                            background: '#ef4444',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: processingTokens[resume.tokenId] ? 0.6 : 1
                          }}
                        >
                          Reject Timesheet
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PayrollPortal
