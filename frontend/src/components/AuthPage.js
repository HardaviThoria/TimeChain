"use client"

import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "./AuthPage.css"
import { Lock, User, Users, Loader } from "react-feather"

const AuthPage = ({ setUserRole, contract, accounts, web3 }) => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("employee")
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    const endpoint = isRegister ? "http://localhost:5001/api/register" : "http://localhost:5001/api/login"

    setLoading(true)

    try {
      if (!accounts || accounts.length === 0) {
        alert("No Ethereum account found. Please connect your wallet.")
        setLoading(false)
        return
      }

      const payload = {
        username,
        password,
        role,
        address: accounts[0],
        name: username,
      }

      const response = await axios.post(endpoint, payload)
      console.log("Response:", response.data)

      // Blockchain registration only for department/payroll
      // NOTE: Registration happens on the backend using the owner account
      // Frontend registration is not needed since registerEmployer/registerInstitution are onlyOwner functions
      // The backend handles blockchain registration during /api/register

      if (isRegister) {
        alert("Registration successful! Please log in with your credentials.")
        setIsRegister(false)
        setUsername("")
        setPassword("")
        return
      }

      // Login flow
      if (response.data.role) {
        setUserRole(response.data.role)
        navigate(`/${response.data.role}`)
      } else {
        alert("Authentication failed!")
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message)
      alert(error.response?.data?.message || "Authentication failed!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Side - Branding Section */}
        <div className="branding-section">
          <div className="branding-content">
            <div className="logo-container">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h1 className="app-title">TimeChain</h1>
            <p className="app-subtitle">Blockchain-Based Timesheet Management System</p>
            <div className="developer-info">
              <p className="developer-label">Developed by:</p>
              <p className="developer-names">Hardavi Thoria, Pranav Sheth</p>
            </div>
            <div className="branding-features">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Secure & Transparent</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Immutable Records</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <span>Decentralized Storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="form-section">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{isRegister ? "Create New Account" : "Sign In"}</h2>
              <p className="auth-subtitle">
                {isRegister ? "Join TimeChain to manage your timesheets" : "Access your timesheet dashboard"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              <div className="form-group">
                <label htmlFor="username">
                  <User size={16} />
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={16} />
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">
                  <Users size={16} />
                  Account Type
                </label>
                <div className="select-wrapper">
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="employee">Employee</option>
                    <option value="department">Department</option>
                    <option value="payroll">Payroll Department</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <>
                    <Loader size={18} className="spinner" />
                    <span>Processing...</span>
                  </>
                ) : isRegister ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="auth-footer">
              <span className="footer-text">
                {isRegister ? "Already have an account?" : "Don't have an account?"}
              </span>
              <button 
                type="button"
                className="switch-mode-button" 
                onClick={() => setIsRegister(!isRegister)} 
                disabled={loading}
              >
                {isRegister ? "Sign In" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
