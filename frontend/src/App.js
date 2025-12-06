import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Web3 from 'web3'; // ✅ Correct import
import contractData from './contract.json';
import AuthPage from './components/AuthPage';
import EmployeePortal from './components/EmployeePortal';
import DepartmentPortal from './components/DepartmentPortal';
import PayrollPortal from './components/PayrollPortal';
import AdminPortal from './components/AdminPortal';

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const loadBlockchainData = async () => {
    try {
      let web3Instance;

      if (window.ethereum) {
        web3Instance = new Web3(window.ethereum);
        await window.ethereum.enable();
      } else if (window.web3) {
        web3Instance = new Web3(window.web3.currentProvider);
      } else {
        alert('Non-Ethereum browser detected. Please install MetaMask!');
        return;
      }

      setWeb3(web3Instance);

      const accountsList = await web3Instance.eth.getAccounts();
      setAccounts(accountsList);

      const networkId = await web3Instance.eth.net.getId();
      const deployedNetwork = contractData.networks[networkId];

      if (deployedNetwork) {
        const contractInstance = new web3Instance.eth.Contract(
          contractData.abi,
          deployedNetwork.address
        );
        setContract(contractInstance);
        console.log('Contract initialized:', contractInstance);
      } else {
        alert('Smart contract not deployed to the current network.');
      }
    } catch (error) {
      console.error('Error initializing blockchain data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    alert('You have been logged out.');
  };

  const handleAccountChange = (accounts) => {
    if (accounts.length === 0) {
      alert('Please connect to MetaMask.');
    } else {
      setAccounts(accounts);
    }
  };

  const handleNetworkChange = () => {
    window.location.reload();
  };

  useEffect(() => {
    loadBlockchainData();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleNetworkChange);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #d1fae5',
          borderTopColor: '#059669',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <p style={{
          color: '#475569',
          fontSize: '1rem',
          fontWeight: '600',
          margin: 0
        }}>Loading Blockchain Data...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!web3 || !contract) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
        padding: '2rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '3rem',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '2px solid #a7f3d0'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'white',
            fontSize: '32px'
          }}>⚠</div>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 0.75rem 0'
          }}>Connection Error</h2>
          <p style={{
            color: '#475569',
            margin: '0 0 2rem 0',
            fontSize: '0.9375rem',
            lineHeight: '1.6'
          }}>
            Error connecting to blockchain. Please ensure MetaMask is connected
            and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AuthPage
              setUserRole={setUserRole}
              contract={contract}
              accounts={accounts}
              web3={web3}
            />
          }
        />
        <Route
          path="/employee"
          element={
            userRole === 'employee' ? (
              <EmployeePortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/department"
          element={
            userRole === 'department' ? (
              <DepartmentPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/payroll"
          element={
            userRole === 'payroll' ? (
              <PayrollPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            userRole === 'admin' ? (
              <AdminPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
