import { describe, expect, it } from 'vite-plus/test';
import { findStepsArrayStart } from './ai.service.js';

describe('findStepsArrayStart', () => {
  it('finds the steps array when JSON is formatted with whitespace', () => {
    const json = `{
      "title": "理解浏览器渲染",
      "description": "从输入 URL 到页面绘制",
      "estimatedMinutes": 60,
      "finalOutcome": ["能讲清主链路"],
      "steps": [
        {
          "title": "理解导航",
          "description": "理解导航请求如何开始",
          "estimatedMinutes": 10
        }
      ]
    }`;

    const result = findStepsArrayStart(json);

    expect(result).not.toBeNull();
    expect(json.slice(result?.arrayBodyStart).trimStart().startsWith('{')).toBe(true);
  });

  it('ignores the word steps inside a string value', () => {
    const json = `{
      "description": "这里提到 \\"steps\\": [ 但它只是字符串",
      "steps": []
    }`;

    const result = findStepsArrayStart(json);

    expect(result).not.toBeNull();
    expect(json[result?.arrayBodyStart ?? -1]).toBe(']');
  });
});
