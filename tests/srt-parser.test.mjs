import assert from 'node:assert/strict';
import { it, describe } from 'node:test';
import { parseSrt } from '../server.mjs';

describe('SRT Parser Unit Tests', () => {
  it('parses multi-line SRT subtitles with timestamps accurately', () => {

const sampleSrt = `
1
00:00:01,500 --> 00:00:03,800
Lời Chúa trong ngày hôm nay

2
00:00:03,800 --> 00:00:06,200
Bài trích Phúc Âm theo thánh Mát-thêu.
`;

const parsed = parseSrt(sampleSrt);
console.log('Parsed subtitles from SRT:', parsed);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].text, 'Lời Chúa trong ngày hôm nay');
    assert.equal(parsed[0].startMs, 1500);
    assert.equal(parsed[0].durationMs, 2300);

    assert.equal(parsed[1].text, 'Bài trích Phúc Âm theo thánh Mát-thêu.');
    assert.equal(parsed[1].startMs, 3800);
    assert.equal(parsed[1].durationMs, 2400);
  });
});
