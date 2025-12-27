const plusIcon =
  "https://www.figma.com/api/mcp/asset/5d6e6e0c-2116-4001-a915-6307b6ed636d";

export default function PrimaryActionButton() {
  return (
    <button
      className="relative flex w-full items-center justify-center gap-2 rounded-md border border-[#0b5be8] bg-[#155aef] px-4 py-2 text-[13px] font-medium text-white shadow-[0_2px_2px_-1px_rgba(0,0,0,0.12),0_1px_1px_-1px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(9,9,11,0.05)]"
      type="button"
    >
      <span className="flex h-4 w-4 items-center justify-center">
        <img alt="" className="h-4 w-4" src={plusIcon} />
      </span>
      Create form this sample app
      <span className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_-6px_12px_-4px_rgba(9,9,11,0.08),inset_0_0_1px_0_rgba(255,255,255,0.16),inset_0_0.5px_0_0_rgba(255,255,255,0.08)]" />
    </button>
  );
}
