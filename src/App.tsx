import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Judges from './pages/Judges'
import QueueDetailPage from './pages/QueueDetailPage'
import QueuesPage from './pages/QueuesPage'
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
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/queues/:queueId" element={<QueueDetailPage />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </>
  )
}

export default App
