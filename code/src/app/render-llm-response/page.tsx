import { Markdown } from "@/lib/markdown/react-markdown";

// https://github.com/google/A2UI 描述 UI 结构。前端根据结构渲染对应组件。
export default function RenderLLMResponsePage() {
  const testSteps = `
1. 确认天数与人数：写成 \`3天/2人\`
2. 选住宿档位：经济/舒适/高端
3. 选交通方式：公共交通/租车/包车`.trim();
  return <div>
    <Markdown content={`
# h1
:::card{title="旅行预算速算" subtitle="输入目的地与天数，我给你一个可执行的预算框架" icon="🧾"}
你可以按下面三类先填数字，缺的写“未知”也行。
:::


:::kpi{label="住宿/晚" value="¥800" delta="中位数参考" trend="flat"}
:::
:::kpi{label="餐饮/天" value="¥300" delta="可下调" trend="down"}
:::

:::steps
${testSteps}
:::
:::swot{strengths="## clear~~ value proposition; Fast onboarding; ddd" weaknesses="Limited integrations; Small support team" opportunities="Growing SMB demand; New partner channels" threats="Aggressive incumbents; Price competition"}
:::
## h2
:::swot{strengths="\*\*安全性\*\*: 数据完全本地化，敏感医疗信息（PHI/PII）不离开内部网络，符合 HIPAA 等监管要求；模型权重和推理过程可控，减少第三方数据泄露风险。 成本: 长期来看，对于高频、大规模使用场景，硬件投入摊销后，单次推理成本可能低于 API 调用。 性能: 可根据具体业务需求进行模型微调（fine-tuning）和优化，针对特定医疗任务（如医学文献摘要、诊断辅助、药物发现）可实现更高的精度和响应速度。 维护: 完全掌控软硬件环境，可进行深度定制和集成，满足特殊的合规性和技术栈要求；避免因第三方API策略变动（如价格调整、服务降级）而受影响。" weaknesses="安全性: 依赖内部安全团队的能力和资源，数据泄露风险依然存在于内部；需要投入大量精力确保服务器、网络和数据访问的安全。 成本: 初期硬件采购、集群搭建、电力、冷却和数据中心租赁（或自建）成本极高；需要招聘和维护一支具备深厚 AI 基础设施经验的专业团队，人力成本高昂。 性能: Llama-3 的基础模型能力可能不如 GPT-4o 先进，需要大量的微调和工程优化才能达到同等甚至超越的水平，这本身就需要可观的研发投入。 维护: 部署、配置、监控、升级和故障排除极为复杂，需要持续的技术支持和维护，技术门槛高；模型迭代和更新也需要内部团队来完成。" opportunities="安全性: 建立强大的内部数据安全壁垒，可作为医疗行业内的数据安全标杆；为特定高度敏感的应用场景提供独特优势。 成本: 成为 AI 基础设施领域的专家，可为其他需要类似解决方案的医疗机构提供服务（潜在的 B2B 机会）。 性能: 创造独特、高度专业化的 AI 应用，形成差异化竞争优势；掌握核心技术，为未来医学 AI 的发展奠定基础。 维护: 培养并积累宝贵的 AI 基础设施运营和模型部署经验，吸引顶尖 AI 人才。" threats="安全性: 内部安全漏洞可能导致比第三方API更严重的后果；难以获得最新、最全面的安全防护措施。 成本: 硬件折旧、能源消耗、软件许可（如果有）以及人力成本持续累积，可能超出预期；模型快速迭代可能导致硬件很快过时。 性能: 难以与 OpenAI 等公司在模型研发上的投入和速度匹敌，可能在通用能力上逐渐落后；模型幻觉（hallucination）等问题需要自行解决。 维护: 维护成本高昂且持续，容易陷入技术债务；模型调优和泛化能力可能受限，难以应对复杂多变的医疗场景。"}
bbb    
`} isAnimating={false} />



  </div>;
}
