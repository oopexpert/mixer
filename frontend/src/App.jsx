import './App.css'
import { useState } from 'react';
import axios from 'axios';

import MixerUI from './MixerUI'; 
import AdminPanel from './AdminPanel';

function App() {

  axios.defaults.baseURL = ''

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  const handleAdminToggle = async () => {
    if (!isAdmin) {
      // 1. Passwort abfragen
      const password = prompt("Admin-Passwort eingeben:");
      if (!password) return;

      try {
        // 2. Den noop-Endpunkt aufrufen
        await axios.get(`/admin/login-check?adminToken=${password}`);
        
        // 3. Wenn erfolgreich (kein Error), Token speichern und umschalten
        setAdminToken(password);
        setIsAdmin(true);
      } catch (error) {
        alert("Passwort falsch oder Server nicht erreichbar!");
      }
    } else {
      // Ausloggen
      setIsAdmin(false);
      setAdminToken("");
    }
  };

  return (
    <div>
      {isAdmin ? (
        <AdminPanel adminToken={adminToken} onLogout={handleAdminToggle} />
      ) : (
        <MixerUI 
          isAdmin={isAdmin}
          adminToken={adminToken}
          onAdminToggle={handleAdminToggle}
        />
      )}
    </div>
  );
}

export default App;