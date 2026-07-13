import { supabase, SUBMIT_FUNCTION, GET_RESULT_FUNCTION } from "./config.js";
import { getParam } from "./dom.js";

// Supabaseから公開データを取得する関数
export async function loadExam() {
  if (window.__EXAM_DATA__) return window.__EXAM_DATA__; // 単体プレビュー用

  // URLからexam_idを取得
  const id = window.__EXAM_ID__ || getParam("exam");
  if (!id) throw { kind: "no-param" };
  if (!/^[A-Za-z0-9_\-]+$/.test(id)) throw { kind: "bad-id" };

  // データベースから試験のメタデータを取得
  const { data: exam, error: e1 } = await supabase
    .schema('exam')
    .from("exams")
    .select("*")
    .eq("exam_id", id)
    .single();
  if (e1 || !exam) throw { kind: "not-found" };

  // データベースから設問のデータを取得
  const { data: qs, error: e2 } = await supabase
    .schema('exam')
    .from("questions")
    .select("*")
    .eq("exam_id", id)
    .order("position", { ascending: true });
  if (e2) throw { kind: "load-error" };

  return {
    exam_id: exam.exam_id,
    meta: {
      subject: exam.exam_subject,
      title: exam.title,
      term: exam.term,
      duration_minutes: exam.duration_minutes,
      total_points: exam.total_points,
      instructions: exam.instructions,
    },
    questions: (qs ?? []).map((q) => ({
      id: q.question_id,
      type: q.format,
      prompt: q.prompt,
      choices: q.choices,
      points: q.points
    })),
  };
}

/** 回答を Edge Function へ送信（採点・記録はサーバ側）。応答を読める */
export async function submitResponses(payload) {
  const { data, error } = await supabase.functions.invoke(SUBMIT_FUNCTION, { body: payload });
  if (error) throw error;
  return data;
}

/** 成績結果を取得する */
export async function loadResult(submissionId) {
  const { data, error } = await supabase.functions.invoke(GET_RESULT_FUNCTION, {
    body: { submission_id: submissionId }
  });
  if (error) throw error;
  return data;
}