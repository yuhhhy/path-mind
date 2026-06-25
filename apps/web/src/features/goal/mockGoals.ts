import type { Goal } from './types';

export const mockGoals: Goal[] = [
  {
    id: 'browser-rendering',
    title: '学会从输入 URL 到浏览器渲染',
    description: '理解从用户输入 URL 到浏览器最终渲染页面的完整流程，并能够用面试语言清楚表达。',
    type: 'understand_concept',
    status: 'active',
    progress: 35,
    estimatedMinutes: 45,
    learningConfig: {
      teachingStrategy: 'first_principles',
      preferredOutputFormats: ['flowchart', 'text'],
      assessmentMethods: ['teach_back', 'interview_question'],
    },
    finalOutcome: [
      '能画出完整流程图',
      '能解释 DNS、TCP、TLS、HTTP、HTML 解析、渲染流水线之间的关系',
      '能回答常见前端面试问题',
      '能用自己的话独立讲出来',
    ],
    steps: [
      {
        id: 'overview',
        title: '建立整体流程',
        description: '先从全局看清楚 URL 输入后的主干链路。',
        status: 'done',
        estimatedMinutes: 8,
      },
      {
        id: 'network-request',
        title: '理解网络请求阶段',
        description: '理解 URL 解析、DNS、TCP、TLS、HTTP 请求之间的顺序。',
        status: 'learning',
        estimatedMinutes: 12,
      },
      {
        id: 'html-css-parsing',
        title: '理解 HTML 与 CSS 解析',
        description: '理解 DOM、CSSOM 如何被构建出来。',
        status: 'todo',
        estimatedMinutes: 10,
      },
      {
        id: 'rendering-pipeline',
        title: '理解浏览器渲染流水线',
        description: '理解 Render Tree、Layout、Paint、Composite 的作用。',
        status: 'todo',
        estimatedMinutes: 15,
      },
      {
        id: 'teach-back',
        title: '用自己的话讲一遍',
        description: '通过费曼学习法验证是否真正理解。',
        status: 'todo',
        estimatedMinutes: 10,
      },
    ],
  },
];
