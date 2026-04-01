import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Judges from './pages/Judges'
import Queue from './pages/Queue'
import Results from './pages/Results'
import UploadPage from './pages/UploadPage'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/judges" element={<Judges />} />
        <Route path="/queue/:queueId" element={<Queue />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </>
  )
}

export default App
