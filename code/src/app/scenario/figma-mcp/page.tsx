import BasicInfoCard from "./components/BasicInfoCard";
import FileQuestionBubble from "./components/FileQuestionBubble";

export default function Page() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#0a0a0a] px-6 py-10 text-white">
      <div className="flex w-full max-w-5xl flex-col items-start gap-8">
        <BasicInfoCard />
        <FileQuestionBubble />
      </div>
    </div>
  );
}
