import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Judges from './pages/Judges'
import Queue from './pages/Queue'
import Results from './pages/Results'
import Upload from './pages/Upload'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/judges" element={<Judges />} />
        <Route path="/queue/:queueId" element={<Queue />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </>
  )
}

export default App
