const STEPS = [
  { title: 'Plan routes', text: 'Define routes and stops for your depot network.' },
  { title: 'Build timetables', text: 'Assign buses and drivers to trips without conflicts.' },
  { title: 'Approve & operate', text: 'Depot managers approve schedules; drivers see their trips.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-fleet-tertiary-light">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-depot-navy sm:text-4xl">How it works</h2>
        <div className="relative mx-auto mt-14 max-w-4xl">
          <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-gradient-to-b from-depot-navy via-depot-blue-light to-depot-blue-muted md:left-1/2 md:-translate-x-1/2" />
          {STEPS.map(({ title, text }, i) => (
            <div
              key={title}
              className="relative mb-10 pl-16 last:mb-0 md:grid md:grid-cols-2 md:gap-16 md:pl-0"
            >
              <div className="absolute left-6 top-6 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-depot-navy text-lg font-bold text-white shadow-elevated ring-8 ring-fleet-tertiary-light md:left-1/2">
                {i + 1}
              </div>
              <div
                className={`relative overflow-hidden rounded-3xl bg-white p-7 shadow-card ${
                  i % 2 ? 'md:col-start-2' : 'md:col-start-1 md:text-right'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-3 select-none text-8xl font-black text-depot-navy/5 ${
                    i % 2 ? 'right-4' : 'right-4 md:left-4 md:right-auto'
                  }`}
                >
                  0{i + 1}
                </span>
                <h3 className="relative text-lg font-semibold">{title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-on-surface-variant">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
