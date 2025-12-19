// import { Markdown } from "@/lib/markdown/streamdown";
import { Markdown } from "@/lib/markdown/react-markdown";
import { renderMarkdoc } from "@/lib/markdown/markdoc";

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

streamdown have problem rendering steps
:::steps
${testSteps}
:::


        `} isAnimating={false} />


    {renderMarkdoc(`
# h1
* things 1
* things 2

{% card title="旅行预算速算" subtitle="输入目的地与天数，我给你一个可执行的预算框架" icon="🧾" %}
你可以按下面三类先填数字，缺的写“未知”也行。
{% /card %}

{% kpi label="住宿/晚" value="¥800" delta="中位数参考" trend="flat" /%}
{% kpi label="餐饮/天" value="¥300" delta="可下调" trend="down" /%}

{% steps title="步骤" %}
${testSteps}
{% /steps %}
          `)}

  </div>;
}
