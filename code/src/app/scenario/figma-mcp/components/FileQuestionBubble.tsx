import FilePreviewGrid from "./FilePreviewGrid";

export default function FileQuestionBubble() {
  return (
    <div className="flex w-full max-w-[680px] flex-col items-end gap-3 rounded-2xl bg-[#296dff] px-4 py-3 text-white shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
      <FilePreviewGrid />
      <p className="text-[15px] font-normal leading-6 tracking-[-0.075px]">
        What are these documents?
      </p>
    </div>
  );
}
