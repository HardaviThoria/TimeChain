"use client"

import React, { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
  FileText,
  CheckCircle,
  Clock,
  LogOut,
  Award,
  User,
  ExternalLink,
  ChevronDown,
  Info,
  ArrowRight,
  XCircle,
  Moon,
  Sun,
  List,
  RefreshCw,
} from "react-feather"
import "./DepartmentPortal.css"

const DepartmentPortal = ({ contract, accounts, handleLogout }) => {
  const [resumes, setResumes] = useState([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registeredPayrollDepartments, setRegisteredPayrollDepartments] = useState([])
  const [selectedPayrollDepartments, setSelectedPayrollDepartments] = useState({})
  const [requestStatus, setRequestStatus] = useState({})
  const [expandedItems, setExpandedItems] = useState({})
  const [rejectionReasons, setRejectionReasons] = useState({})
  const [showRejectionModal, setShowRejectionModal] = useState({})
  const [auditTrails, setAuditTrails] = useState({})
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true')
  const [departmentName, setDepartmentName] = useState("")

  // Toggle resume card expanded state
  const toggleExpanded = (tokenId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [tokenId]: !prev[tokenId],
    }))
  }

  // Check if the department is registered and get department name
  const checkDepartmentRegistration = useCallback(async () => {
    try {
      const registered = await contract.methods.institutions(accounts[0]).call()
      setIsRegistered(registered)
      if (registered) {
        try {
          const name = await contract.methods.getInstitutionName(accounts[0]).call()
          const normalizedName = String(name).toLowerCase().trim()
          console.log("✅ Department name fetched from blockchain:", `"${name}"`, "-> normalized:", `"${normalizedName}"`)
          setDepartmentName(normalizedName)
          console.log("✅ Department address:", accounts[0])
        } catch (error) {
          console.error("❌ Error fetching department name:", error.message)
          console.error("Error details:", error)
        }
      } else {
        console.log("⚠️ Department not registered on blockchain")
      }
    } catch (error) {
      console.error("Error checking department registration:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract, accounts])

  // Fetch registered payrolls from backend
  const fetchRegisteredPayrollDepartments = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/payrolls")
      if (response.data && response.data.payrolls) {
        setRegisteredPayrollDepartments(response.data.payrolls)
      }
    } catch (error) {
      console.error("Error fetching payrolls:", error.message)
    }
  }, [])

  const fetchResumes = useCallback(async () => {
    if (!departmentName) {
      console.log("⚠️ Department name not set, but fetching resumes anyway for debugging")
      console.log("Current departmentName state:", departmentName)
    }
    
    try {
      setLoading(true)
      console.log("📋 Fetching all resumes from blockchain...")
      console.log("📋 Current department name:", departmentName || "(not set)")
      const events = await contract.getPastEvents("NFTMinted", {
        fromBlock: 0,
        toBlock: "latest",
      })
      
      console.log(`📋 Found ${events.length} NFT event(s) on blockchain`)
      if (events.length === 0) {
        console.log("⚠️ No NFT events found! Make sure employees have submitted resumes.")
      }

      const resumeList = await Promise.all(
        events.map(async (event) => {
          const returnValues = event.returnValues
          const tokenId = returnValues.tokenId || returnValues[1]
          const employeeAddress = returnValues.applicant || returnValues[0]
          
          console.log("Fetching resume for Token ID:", tokenId)
          // Use getResumeByTokenId to get data specific to this tokenId (prevents overwriting issue)
          let resumeData
          try {
            resumeData = await contract.methods.getResumeByTokenId(tokenId).call()
            console.log("Resume Data by TokenId:", resumeData)
          } catch (error) {
            // Fallback to old method if new function doesn't exist (for backward compatibility)
            console.log("Falling back to getResume by address")
            resumeData = await contract.methods.getResume(employeeAddress).call()
          }
          
          const isVerifiedByDepartment = await contract.methods.isVerifiedByInstitution(tokenId).call()

          // Defensive unpacking of payroll request
          const request = await contract.methods.getInstitutionRequest(tokenId).call()
          const payrollName = request[0] || ""
          const requested = request[1] || false

          const isVerifiedByPayroll = await contract.methods.isVerifiedByEmployer(tokenId).call()

          // Fetch rejection data (with error handling)
          let isRejectedByDept = false
          let deptRejectionReason = ""
          let isRejectedByPayroll = false
          try {
            const deptRejection = await contract.methods.getDepartmentRejection(tokenId).call()
            // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
            isRejectedByDept = deptRejection[0] === true || deptRejection[0] === "true"
            deptRejectionReason = deptRejection[1] || ""
          } catch (error) {
            console.log(`Warning: Could not fetch department rejection for token ${tokenId}:`, error.message)
          }
          
          try {
            const payrollRejection = await contract.methods.getPayrollRejection(tokenId).call()
            // Contract returns object with numeric keys: {0: bool, 1: string, 2: address, 3: uint256}
            isRejectedByPayroll = payrollRejection[0] === true || payrollRejection[0] === "true"
          } catch (error) {
            console.log(`Warning: Could not fetch payroll rejection for token ${tokenId}:`, error.message)
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
            payrollRejectionReason: ""
          }
          try {
            const trailData = await contract.methods.getAuditTrail(tokenId).call()
            // Contract returns object with numeric keys, not a true array
            if (trailData && (trailData.__length__ >= 12 || Object.keys(trailData).length >= 12)) {
              auditTrail = {
                submittedAt: trailData[0] || 0,
                submittedBy: trailData[1] || "0x0",
                departmentVerifiedAt: trailData[2] || 0,
                departmentVerifiedBy: trailData[3] || "0x0",
                payrollVerifiedAt: trailData[4] || 0,
                payrollVerifiedBy: trailData[5] || "0x0",
                departmentRejectedAt: trailData[6] || 0,
                departmentRejectedBy: trailData[7] || "0x0",
                departmentRejectionReason: trailData[8] || "",
                payrollRejectedAt: trailData[9] || 0,
                payrollRejectedBy: trailData[10] || "0x0",
                payrollRejectionReason: trailData[11] || ""
              }
            }
          } catch (error) {
            console.log(`Warning: Could not fetch audit trail for token ${tokenId}:`, error.message)
          }

          return {
            tokenId,
            employeeAddress,
            employeeName: resumeData[0] || "Unknown",
            resumeHash: resumeData[1] || "",
            departmentName: resumeData[2] || "",
            payrollRequested: payrollName,
            requested,
            isVerifiedByDepartment,
            isVerifiedByPayroll,
            isRejectedByDepartment: isRejectedByDept,
            departmentRejectionReason: deptRejectionReason || "",
            isRejectedByPayroll: isRejectedByPayroll,
            auditTrail: auditTrail
          }
        }),
      )
      
      console.log("All Resumes (before filtering):", resumeList)
      console.log("Current Department Name:", departmentName)
      
      // Filter resumes to only show those submitted to this department
      let filteredResumes = []
      
      if (departmentName) {
        filteredResumes = resumeList.filter(resume => {
          const resumeDeptName = String(resume.departmentName || "").toLowerCase().trim()
          const currentDeptName = String(departmentName || "").toLowerCase().trim()
          const matches = resumeDeptName === currentDeptName
          
          console.log(`🔍 Resume ${resume.tokenId}:`)
          console.log(`   - Employee: ${resume.employeeName}`)
          console.log(`   - Resume Dept: "${resumeDeptName}" (original: "${resume.departmentName}")`)
          console.log(`   - Current Dept: "${currentDeptName}"`)
          console.log(`   - Match: ${matches ? "✅ YES" : "❌ NO"}`)
          
          if (!matches) {
            console.log(`   ⚠️ Skipping resume ${resume.tokenId} - department name mismatch`)
          }
          return matches
        })
      } else {
        // Temporarily show all resumes if department name not set (for debugging)
        console.log("⚠️ Department name not set - showing ALL resumes for debugging")
        filteredResumes = resumeList
      }
      
      console.log(`\n✅ Filtered Resume List: ${filteredResumes.length} resume(s) for department "${departmentName || 'ALL (debug)'}"`)
      console.log("Resume details:", filteredResumes.map(r => ({ 
        tokenId: r.tokenId, 
        employee: r.employeeName, 
        dept: r.departmentName 
      })))
      if (filteredResumes.length === 0 && resumeList.length > 0) {
        console.log("⚠️ No resumes match this department!")
        console.log("Available resumes:", resumeList.map(r => ({ 
          tokenId: r.tokenId, 
          employee: r.employeeName,
          dept: r.departmentName,
          deptLower: (r.departmentName || "").toLowerCase().trim()
        })))
        console.log("Expected department:", departmentName.toLowerCase().trim())
        console.log("⚠️ If this is unexpected, check if department names match exactly")
      }

      // If no filtered resumes but we have resumes, show a warning but still set empty array
      // (We want to keep filtering to only show relevant resumes)
      setResumes(filteredResumes)
      
      // If filtering resulted in 0 but we have resumes, log a detailed comparison
      if (filteredResumes.length === 0 && resumeList.length > 0) {
        resumeList.forEach(r => {
          const rDept = (r.departmentName || "").toLowerCase().trim()
          const cDept = (departmentName || "").toLowerCase().trim()
          console.log(`Comparison for resume ${r.tokenId}: "${rDept}" === "${cDept}" = ${rDept === cDept}`)
        })
      }
      
      // Store audit trails separately for easy access
      const trails = {}
      filteredResumes.forEach(resume => {
        trails[resume.tokenId] = resume.auditTrail
      })
      setAuditTrails(trails)
    } catch (error) {
      console.error("Error fetching resumes:", error.message)
    } finally {
      setLoading(false)
    }
  }, [contract, departmentName])

  const requestVerification = async (tokenId) => {
    const payrollName = selectedPayrollDepartments[tokenId]
    if (!payrollName) {
      alert("Please select an payroll.")
      return
    }

    try {
      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "processing",
      }))

      await contract.methods
        .requestVerificationByEmployer(
          tokenId,
          payrollName,
          "DepartmentName" // Replace with actual department name if dynamic
        )
        .send({ from: accounts[0] })

      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "requested",
      }))
      
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<CheckCircle size={18} /> Requested verification from ${payrollName}`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
      
      fetchResumes()
    } catch (error) {
      console.error("Error requesting verification:", error.message)
      setRequestStatus((prev) => ({
        ...prev,
        [tokenId]: "error",
      }))
      
      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = "Verification request failed"
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    }
  }

  const verifyResume = async (tokenId) => {
    try {
      await contract.methods.verifyByInstitution(tokenId).send({ from: accounts[0] })
      
      // Show success notification
      const notification = document.createElement("div")
      notification.className = "notification success"
      notification.innerHTML = `<CheckCircle size={18} /> Timesheet with Token ID ${tokenId} verified by Department`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
      
      fetchResumes()
    } catch (error) {
      console.error("Error verifying resume:", error.message)
      
      // Show error notification
      const notification = document.createElement("div")
      notification.className = "notification error"
      notification.innerHTML = "Verification failed"
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.classList.add("hide")
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    }
  }

  const rejectResume = async (tokenId) => {
    const reason = rejectionReasons[tokenId] || ""
    if (!reason.trim()) {
      alert("Please provide a rejection reason")
      return
    }

    try {
      await contract.methods.rejectByDepartment(tokenId, reason).send({ from: accounts[0] })
      
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
    const initialize = async () => {
      await checkDepartmentRegistration()
      fetchRegisteredPayrollDepartments()
    }
    initialize()
  }, [checkDepartmentRegistration, fetchRegisteredPayrollDepartments])

  useEffect(() => {
    console.log("🔄 useEffect triggered - departmentName:", departmentName, "isRegistered:", isRegistered)
    if (isRegistered) {
      if (departmentName) {
        console.log("✅ Conditions met - fetching resumes for department:", departmentName)
        // Use a small delay to ensure state is properly set
        const timer = setTimeout(() => {
          fetchResumes()
        }, 200)
        return () => clearTimeout(timer)
      } else {
        console.log("⏳ Department registered but name not fetched yet. Will fetch resumes once name is available.")
      }
    } else {
      console.log("⏳ Waiting for registration. Current state:", { 
        departmentName: departmentName || "(empty)", 
        isRegistered 
      })
    }
  }, [departmentName, isRegistered, fetchResumes])

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
        <p>You are not a registered department on this platform.</p>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          <span>Return to Login</span>
        </button>
      </div>
    )
  }

  return (
    <div className="portal-wrapper">
      <div className="department-portal">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TimeChain</h1>
            <span className="portal-subtitle">Department Portal</span>
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
              <h2>Employee Verification</h2>
              <p>Manage timesheet verification requests from multiple employees. Each employee submission is tracked separately.</p>
              {departmentName && (
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Department: <strong>{departmentName}</strong>
                </p>
              )}
            </div>
            <button
              onClick={() => {
                console.log("🔄 Manual refresh triggered")
                if (departmentName && isRegistered) {
                  fetchResumes()
                } else {
                  checkDepartmentRegistration().then(() => {
                    if (departmentName && isRegistered) {
                      fetchResumes()
                    }
                  })
                }
              }}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'var(--emerald-500)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{resumes.length}</div>
                <div className="stat-label">Total Timesheets</div>
                {resumes.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {new Set(resumes.map(r => r.employeeName)).size} unique employee{new Set(resumes.map(r => r.employeeName)).size !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="stat">
                <div className="stat-value">
                  {resumes.filter((resume) => resume.isVerifiedByDepartment).length}
                </div>
                <div className="stat-label">Verified by You</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {resumes.filter((resume) => resume.isVerifiedByPayroll).length}
                </div>
                <div className="stat-label">Verified by Payroll Department</div>
              </div>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Timesheets Found</h3>
              <p>No timesheets have been submitted to your company yet.</p>
            </div>
          ) : (
            <div className="resume-list">
              {resumes.map((resume) => (
                <React.Fragment key={resume.tokenId}>
                <div 
                  className={`resume-card ${expandedItems[resume.tokenId] ? 'expanded' : ''}`}
                >
                  <div className="resume-header" onClick={() => toggleExpanded(resume.tokenId)}>
                    <div className="resume-icon">
                      <FileText size={24} />
                    </div>
                    <div className="resume-title">
                      <h3>{resume.employeeName}</h3>
                      <div className="resume-meta">
                        <span className="token-id">Token ID: {resume.tokenId}</span>
                        {resume.isVerifiedByDepartment && (
                          <span className="verified-badge department">
                            <CheckCircle size={14} />
                            <span>Department Verified</span>
                          </span>
                        )}
                        {resume.isVerifiedByPayroll && (
                          <span className="verified-badge payroll">
                            <CheckCircle size={14} />
                            <span>Payroll Department Verified</span>
                          </span>
                        )}
                        {resume.isRejectedByDepartment && (
                          <span className="verified-badge rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected by Department</span>
                          </span>
                        )}
                        {resume.isRejectedByPayroll && (
                          <span className="verified-badge rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={14} />
                            <span>Rejected by Payroll</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`expand-icon ${expandedItems[resume.tokenId] ? 'rotated' : ''}`} 
                    />
                  </div>
                  
                  <div className="resume-details">
                    <div className="detail-section">
                      <h4>Timesheet Details</h4>
                      <div className="detail-row">
                        <div className="detail-label">Employee Name</div>
                        <div className="detail-value">{resume.employeeName}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">Token ID</div>
                        <div className="detail-value">{resume.tokenId}</div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-label">Timesheet</div>
                        <div className="detail-value">
                          <a 
                            href={`https://gateway.pinata.cloud/ipfs/${resume.resumeHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="resume-link"
                          >
                            <span>View Timesheet</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="verification-section">
                      <div className="department-verification">
                        <h4>Department Verification</h4>
                        {resume.isRejectedByDepartment ? (
                          <div className="verification-status rejected" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={18} />
                            <div>
                              <span>Rejected by Department</span>
                              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                Reason: {resume.departmentRejectionReason}
                              </p>
                            </div>
                          </div>
                        ) : resume.isVerifiedByDepartment ? (
                          <div className="verification-status verified">
                            <CheckCircle size={18} />
                            <span>Verified by Department</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                            <button 
                              className="verify-button"
                              onClick={() => verifyResume(resume.tokenId)}
                            >
                              <CheckCircle size={18} />
                              <span>Verify Timesheet</span>
                            </button>
                            <button
                              className="reject-button"
                              onClick={() => setShowRejectionModal(prev => ({ ...prev, [resume.tokenId]: true }))}
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
                        )}
                      </div>
                      
                      <div className="payroll-verification">
                        <h4>Payroll Department Verification</h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          After verifying, you can request payroll verification. Multiple employees can be forwarded to the same payroll.
                        </p>
                        {resume.isVerifiedByPayroll ? (
                          <div className="verification-status verified">
                            <CheckCircle size={18} />
                            <span>Verified by {resume.payrollRequested}</span>
                          </div>
                        ) : resume.requested ? (
                          <div className="verification-status pending">
                            <Clock size={18} />
                            <span>Requested from {resume.payrollRequested}</span>
                          </div>
                        ) : (
                          <div className="request-form">
                            <div className="select-container">
                              <select
                                value={selectedPayrollDepartments[resume.tokenId] || ""}
                                onChange={(e) =>
                                  setSelectedPayrollDepartments((prev) => ({
                                    ...prev,
                                    [resume.tokenId]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select Payroll Department</option>
                                {registeredPayrollDepartments.map((payroll, idx) => (
                                  <option key={idx} value={payroll}>{payroll}</option>
                                ))}
                              </select>
                              <ChevronDown size={16} className="select-icon" />
                            </div>
                            <button
                              className="request-button"
                              onClick={() => requestVerification(resume.tokenId)}
                              disabled={!selectedPayrollDepartments[resume.tokenId] || requestStatus[resume.tokenId] === "processing"}
                            >
                              {requestStatus[resume.tokenId] === "processing" ? (
                                <>
                                  <div className="spinner small"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <Award size={18} />
                                  <span>Request Verification</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
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
                          onClick={() => rejectResume(resume.tokenId)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '12px',
                            background: '#ef4444',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer'
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

export default DepartmentPortal

