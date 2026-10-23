import { Bus } from 'lucide-react'

function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded p-1.5 ${light ? 'bg-white' : 'bg-depot-navy'}`}>
        <Bus size={20} className={light ? 'text-depot-navy' : 'text-white'} />
      </div>
      <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-depot-navy'}`}>
        TransitLK
      </span>
    </div>
  )
}

export default Brand
