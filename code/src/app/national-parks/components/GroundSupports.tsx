import { GroundingMetadata } from "@/app/api/national-parks/extract/service/park-info";

function GroundingSupports({ metadata }: { metadata?: GroundingMetadata }) {
  const supports = Array.isArray(metadata?.support) ? metadata.support : null;
  const urls = Array.isArray(metadata?.urls) ? metadata.urls : null;

  if ((!supports || supports.length === 0) && (!urls || urls.length === 0)) return null;

  return (
    <div className="mt-3 text-sm">
      <div className="text-xs uppercase tracking-[0.08em] text-gray-400">Grounding Supports</div>
      {urls && urls.length > 0 && (
        <div className="mt-1 rounded border border-white/10 bg-black/40 p-3">
          <div className="mb-2 text-gray-400">All URLs: </div>
          <div className="mb-1 font-mono text-xs text-gray-100 break-words">{urls.join(',')}</div>
        </div>
      )}

      <div className="mt-2 space-y-2">
        {supports?.map((support, idx) => {
          const confidenceScores = support.confidenceScores;
          const segmentText = support.text;

          return (
            <div key={idx} className="rounded border border-white/10 bg-black/40 p-3">
              {typeof support.urlIndex === "number" && (
                <div className="text-gray-200">
                  <span className="text-gray-400">URL:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{urls?.[support.urlIndex]}</span>
                </div>
              )}
              {segmentText && (
                <div className="mt-1 text-gray-200">
                  <span className="text-gray-400">Source:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">{segmentText}</span>
                </div>
              )}
              {confidenceScores && (
                <div className="text-gray-200">
                  <span className="text-gray-400">Confidence Scores:</span>{" "}
                  <span className="font-mono text-xs text-gray-100">
                    {JSON.stringify(confidenceScores)}
                  </span>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GroundingSupports;
