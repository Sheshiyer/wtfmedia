import { expect, it } from "vitest";
import { deepResearchCommand, researchSelection } from "../../lib/research-followup";
const problems = [{id:"p1",title:"Public institutions",question:"How do institutions change?",why:"Public work",domain:"Institutions",sourceIds:["src_a"]},{id:"p2",title:"Technology adoption",question:"How does technology spread?",why:"Public ideas",domain:"Technology",sourceIds:["src_a"]}];
it("routes explicit research commands while keeping questions and sensitive topics in chat", () => {
 for (const text of ["Research option 2", "Please do in-depth research on technology adoption", "Start research: How do institutions change?", "Could you research the second problem?"]) expect(deepResearchCommand(text)).toBe(true);
 for (const text of ["What were the previous problem statements?", "Suggest sensitive topics", "Can you explain option 2?", "Do not research option 2"]) expect(deepResearchCommand(text)).toBe(false);
 expect(researchSelection("Could you research the second problem?",problems)).toEqual({selectedProblemId:"p2"});
 expect(researchSelection("Research option 2",problems)).toEqual({selectedProblemId:"p2"});
 expect(researchSelection("Please do in-depth research on technology adoption",problems)).toEqual({selectedProblemId:"p2"});
 expect(researchSelection("Start research: How does open source change incentives?",problems)).toEqual({problemQuestion:"How does open source change incentives?"});
});
