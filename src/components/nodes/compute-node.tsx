import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { motion } from 'framer-motion'

const typeColors: Record<string, string> = {
  lxc: 'text-green bg-green/10',
  vm: 'text-purple bg-purple/10',
  docker: 'text-cyan bg-cyan/10',
}

const ComputeNode = memo(({ data }: NodeProps) => {
  const compType = (data.type as string) || 'lxc'
  const colorClass = typeColors[compType] || 'text-muted-foreground bg-secondary'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: 0.05 }}
      className="h-full rounded border border-border bg-surface-raised p-3 font-mono"
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-1.5 !h-1.5" />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{data.label as string}</p>
          {data.ip && <p className="text-[10px] text-muted-foreground">{data.ip as string}</p>}
        </div>
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
          {compType}
        </span>
      </div>
    </motion.div>
  )
})

ComputeNode.displayName = 'ComputeNode'

export default ComputeNode
