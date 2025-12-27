const tagIcon =
  "https://www.figma.com/api/mcp/asset/7fad233f-1a58-44c9-a37b-55840d47c55a";

interface TagBadgeProps {
  label: string;
}

export default function TagBadge({ label }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#d0d5dd] bg-white/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#676f83]">
      <span className="flex h-3 w-3 items-center justify-center">
        <img alt="" className="h-3 w-3" src={tagIcon} />
      </span>
      {label}
    </span>
  );
}
