interface FileMetaProps {
  name: string;
  type: string;
  size: string;
  icon: string;
}

export default function FileMetaCard({
  name,
  type,
  size,
  icon,
}: FileMetaProps) {
  return (
    <div className="flex h-[68px] w-[144px] flex-col gap-1 rounded-md border border-[#d0d5dd] bg-white/95 p-2 text-left shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
      <p className="line-clamp-2 text-[12px] font-medium leading-4 text-[#354052]">
        {name}
      </p>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#676f83]">
        <span className="flex h-4 w-4 items-center justify-center">
          <img alt="" className="h-4 w-4" src={icon} />
        </span>
        {type}
        <span className="text-[#98a2b2]">·</span>
        {size}
      </div>
    </div>
  );
}
