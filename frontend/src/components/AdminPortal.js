"use client"

import { useState, useEffect, useCallback } from "react"
import { LogOut, Shield, Users, UserPlus, Copy, Briefcase, Settings } from "react-feather"
import "./AdminPortal.css"

const AdminPortal = ({ contract, accounts, handleLogout }) => {
  const [employerAddress, setEmployerAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [registeredEmployers, setRegisteredEmployers] = useState([])
  const [activeTab, setActiveTab] = useState("employers")
  const [isOwner, setIsOwner] = useState(false)

  // Check if current user is contract owner
  const checkOwnership = useCallback(async () => {
    try {
      const owner = await contract.methods.owner().call()
      setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase())
    } catch (error) {
      console.error("Error checking ownership:", error.message)
      setIsOwner(false)
    }
  }, [contract, accounts])

  // Fetch registered employers
  const fetchRegisteredEmployers = useCallback(async () => {
    try {
      // This is a placeholder - you would need to implement a method to get all employers
      // For example, you might have an event you can query or a getter function
      const events = await contract.getPastEvents("EmployerRegistered", {
        fromBlock: 0,
        toBlock: "latest",
      })

      const employers = events.map((event) => ({
        address: event.returnValues.employer,
        timestamp: new Date(event.returnValues.timestamp * 1000).toLocaleString(),
      }))

      setRegisteredEmployers(employers)
    } catch (error) {
      console.error("Error fetching employers:", error.message)
    }
  }, [contract])

  // Register a new employer
  const registerEmployer = async () => {
    if (!employerAddress) {
      showMessage("Please enter a valid Ethereum address", "error")
      return
    }

    try {
      setLoading(true)
      await contract.methods.registerEmployer(employerAddress).send({ from: accounts[0] })
      showMessage(`Employer ${employerAddress} registered successfully`, "success")
      setEmployerAddress("")
      fetchRegisteredEmployers()
    } catch (error) {
      console.error("Error registering employer:", error.message)
      showMessage("Failed to register employer. Ensure you are the contract owner", "error")
    } finally {
      setLoading(false)
    }
  }

  // Show message with auto-dismiss
  const showMessage = (text, type = "success") => {
    setMessage({ text, type })
    setTimeout(() => {
      setMessage(null)
    }, 5000)
  }

  // Copy address to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    showMessage("Address copied to clipboard", "success")
  }

  useEffect(() => {
    checkOwnership()
    fetchRegisteredEmployers()
  }, [checkOwnership, fetchRegisteredEmployers])

  if (!isOwner) {
    return (
      <div className="access-denied">
        <Shield size={48} />
        <h2>Access Denied</h2>
        <p>You do not have administrator privileges to access this portal.</p>
        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Return to Login</span>
        </button>
      </div>
    )
  }

  return (
    <div className="portal-wrapper">
      <div className="admin-portal">
        <header className="portal-header">
          <div className="portal-title">
            <h1>TimeChain</h1>
            <span className="portal-subtitle">Admin Portal</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        <div className="portal-tabs">
          <button
            className={`tab-button ${activeTab === "employers" ? "active" : ""}`}
            onClick={() => setActiveTab("employers")}
          >
            <Briefcase size={18} />
            <span>Employers</span>
          </button>
          <button
            className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>

        <div className="portal-content">
          {message && (
            <div className={`message ${message.type}`}>
              {message.type === "success" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          )}

          {activeTab === "employers" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Manage Employers</h2>
                <p>Register and manage employer accounts on the platform</p>
              </div>

              <div className="card">
                <h3>Register New Employer</h3>
                <div className="form-group">
                  <label htmlFor="employerAddress">
                    <Briefcase size={16} />
                    <span>Employer Ethereum Address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="employerAddress"
                      placeholder="0x..."
                      value={employerAddress}
                      onChange={(e) => setEmployerAddress(e.target.value)}
                    />
                  </div>
                </div>
                <button className="primary-button" onClick={registerEmployer} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner small"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span>Register Employer</span>
                    </>
                  )}
                </button>
              </div>

              <div className="card">
                <h3>Registered Employers</h3>
                {registeredEmployers.length === 0 ? (
                  <div className="empty-list">
                    <Users size={32} />
                    <p>No employers registered yet</p>
                  </div>
                ) : (
                  <div className="list">
                    {registeredEmployers.map((employer, index) => (
                      <div className="list-item" key={index}>
                        <div className="list-item-icon">
                          <Briefcase size={20} />
                        </div>
                        <div className="list-item-content">
                          <div className="list-item-title">
                            <span className="address">{employer.address}</span>
                            <button
                              className="icon-button"
                              onClick={() => copyToClipboard(employer.address)}
                              title="Copy Address"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="list-item-subtitle">Registered on {employer.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="tab-content">
              <div className="section-header">
                <h2>System Settings</h2>
                <p>Manage platform configuration and settings</p>
              </div>

              <div className="card">
                <h3>Contract Information</h3>
                <div className="info-row">
                  <div className="info-label">Contract Owner</div>
                  <div className="info-value">
                    <span className="address">{accounts[0]}</span>
                    <button className="icon-button" onClick={() => copyToClipboard(accounts[0])} title="Copy Address">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-label">Total Employers</div>
                  <div className="info-value">{registeredEmployers.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPortal
