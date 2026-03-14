import { memo } from 'react'

export type LayoutMode = 'laptop' | 'mobile'

function SegButton(props: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={props.active}
      onClick={props.onClick}
      className={
        'px-3 py-2 text-sm rounded-2xl transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ' +
        (props.active
          ? 'bg-white/12 text-white'
          : 'bg-transparent text-slate-300 hover:bg-white/8 hover:text-white')
      }
    >
      {props.label}
    </button>
  )
}

export default memo(function LayoutToggle(props: {
  mode: LayoutMode
  onChange: (mode: LayoutMode) => void
  autoDetected?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Layout mode"
        className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur"
      >
        <SegButton
          label="💻 Laptop"
          active={props.mode === 'laptop'}
          onClick={() => props.onChange('laptop')}
        />
        <SegButton
          label="📱 Mobile"
          active={props.mode === 'mobile'}
          onClick={() => props.onChange('mobile')}
        />
      </div>
      {props.autoDetected && (
        <span className="text-[10px] text-slate-500">auto</span>
      )}
    </div>
  )
})
