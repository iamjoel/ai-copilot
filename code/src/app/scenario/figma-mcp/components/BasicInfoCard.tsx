import PrimaryActionButton from "./PrimaryActionButton";
import TagBadge from "./TagBadge";

const chatflowIcon =
  "https://www.figma.com/api/mcp/asset/cd9b4f02-f114-4154-a7e6-699e4f2fc52e";

export default function BasicInfoCard() {
  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-[#eaecf0] bg-white text-[#101828] shadow-[0_6px_24px_rgba(16,24,40,0.08)]">
      <div className="flex items-center gap-3 px-4 pb-2 pt-6">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e4e7ec] bg-[#fdf2fa] text-2xl">
            <span aria-hidden="true">🕹️</span>
          </div>
          <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded border border-white bg-[#0ba5ec]">
            <span className="flex h-3 w-3 items-center justify-center rounded-sm border border-[#d0d5dd] bg-gradient-to-br from-white/10 to-white/5">
              <img alt="" className="h-3 w-3" src={chatflowIcon} />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-[#101828]">
            Automated Email Reply
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#676f83]">
            Chatflow
          </p>
        </div>
      </div>

      <div className="px-4 pb-2 pt-1">
        <p className="text-[13px] leading-4 text-[#354052]">
          A workflow designed to translate a full book up to 15000 tokens per
          run. Uses Code node to separate text into chunks
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-1">
        <TagBadge label="Search" />
        <TagBadge label="Productivity" />
      </div>

      <div className="px-4 pb-4 pt-3">
        <PrimaryActionButton />
      </div>
    </div>
  );
}
