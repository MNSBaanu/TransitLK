import Brand from './Brand'

function Footer() {
  return (
    <footer className="bg-depot-nav-bg-subtle text-blue-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6">
        <Brand light />
        <span>&copy; {new Date().getFullYear()} TransitLK. Smart Route Management &amp; Scheduling.</span>
      </div>
    </footer>
  )
}

export default Footer
