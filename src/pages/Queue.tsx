import { useParams } from 'react-router-dom'

function Queue() {
  const { queueId } = useParams<{ queueId: string }>()
  return <div className="p-6 text-slate-700">Queue: {queueId ?? '—'}</div>
}

export default Queue
