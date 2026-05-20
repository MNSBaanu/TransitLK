// Assigned to: Irfa
// Module: Driver Management — merged into Fleet & Personnel page

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Drivers() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/buses', { replace: true }) }, [navigate])
  return null
}

export default Drivers
