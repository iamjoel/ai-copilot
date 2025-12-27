import FileMetaCard from "./FileMetaCard";

const filePattern =
  "https://www.figma.com/api/mcp/asset/d0f32108-dfdd-42cf-8dfb-6af0027635d2";
const filePreviewOne =
  "https://www.figma.com/api/mcp/asset/fc8a2735-a58f-4e11-a206-ab8ba2198b67";
const filePreviewTwo =
  "https://www.figma.com/api/mcp/asset/64cb7daf-3d37-4bad-91a6-12f748bf955d";
const filePdfIcon =
  "https://www.figma.com/api/mcp/asset/b720d2b2-44f1-4857-a1e2-bbf6e5483e08";
const fileXlsIcon =
  "https://www.figma.com/api/mcp/asset/385f21ab-dc98-4af6-a82e-9cbdbbf94af8";
const fileDocIcon =
  "https://www.figma.com/api/mcp/asset/7428738e-bdec-4ada-bf7d-8b574d5157af";

export default function FilePreviewGrid() {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="relative h-[68px] w-[68px] overflow-hidden rounded-md border-2 border-white shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[length:8px_8px] bg-left-top bg-repeat"
          style={{ backgroundImage: `url('${filePattern}')` }}
        />
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          src={filePreviewOne}
        />
      </div>
      <div className="relative h-[68px] w-[68px] overflow-hidden rounded-md border-2 border-white shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          src={filePreviewTwo}
        />
      </div>
      <FileMetaCard
        icon={filePdfIcon}
        name="Harry Potter and the Goblet of Fire.pdf"
        size="3.9 MB"
        type="PDF"
      />
      <FileMetaCard
        icon={fileXlsIcon}
        name="Chat configuration.xls"
        size="1.2 MB"
        type="XLS"
      />
      <FileMetaCard
        icon={fileDocIcon}
        name="R3 User Manual.docx"
        size="1.2 MB"
        type="DOCX"
      />
    </div>
  );
}
