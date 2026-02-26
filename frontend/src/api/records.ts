import { MatchRecordValues } from "../components/MatchRecordModal";

export type MatchRecord = MatchRecordValues & {
  id: number;
  result: string;
  createdAt: string;
};

type MatchRecordDto = {
  id: number;
  created_at: string;
  played_at: string;
  rule: MatchRecordValues["rule"];
  stage: string;
  my_score: number;
  opponent_score: number;
  my_character: string;
  my_partner_character: string | null;
  opponent_character: string;
  opponent_partner_character: string | null;
  my_racket: string | null;
  my_partner_racket: string | null;
  opponent_racket: string | null;
  opponent_partner_racket: string | null;
  my_rate: number;
  result: string;
  my_rate_band: string;
  my_partner_rate_band: string | null;
  opponent_rate_band: string;
  opponent_partner_rate_band: string | null;
  opponent_player_name: string | null;
  my_partner_player_name: string | null;
  opponent_partner_player_name: string | null;
};

type MatchRecordPayload = {
  played_at: string;
  rule: string;
  stage: string;
  my_score: number;
  opponent_score: number;
  my_character: string;
  my_partner_character: string | null;
  opponent_character: string;
  opponent_partner_character: string | null;
  my_racket: string | null;
  my_partner_racket: string | null;
  opponent_racket: string | null;
  opponent_partner_racket: string | null;
  my_rate: number;
  my_rate_band: string;
  my_partner_rate_band: string | null;
  opponent_rate_band: string;
  opponent_partner_rate_band: string | null;
  opponent_player_name: string | null;
  my_partner_player_name: string | null;
  opponent_partner_player_name: string | null;
};

const resolveDefaultApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:8000";
  }
  return window.location.origin;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? resolveDefaultApiBaseUrl();

const pad2 = (value: number) => value.toString().padStart(2, "0");

const formatDatetimeLocal = (isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue.slice(0, 16);
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
};

const trimOrNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const toPayload = (values: MatchRecordValues): MatchRecordPayload => ({
  played_at: values.playedAt,
  rule: values.rule,
  stage: values.stage,
  my_score: Number(values.myScore),
  opponent_score: Number(values.opponentScore),
  my_character: values.myCharacter,
  my_partner_character: trimOrNull(values.myPartnerCharacter),
  opponent_character: values.opponentCharacter,
  opponent_partner_character: trimOrNull(values.opponentPartnerCharacter),
  my_racket: trimOrNull(values.myRacket),
  my_partner_racket: trimOrNull(values.myPartnerRacket),
  opponent_racket: trimOrNull(values.opponentRacket),
  opponent_partner_racket: trimOrNull(values.opponentPartnerRacket),
  my_rate: Number(values.myRate),
  my_rate_band: values.myRateBand,
  my_partner_rate_band: trimOrNull(values.myPartnerRateBand),
  opponent_rate_band: values.opponentRateBand,
  opponent_partner_rate_band: trimOrNull(values.opponentPartnerRateBand),
  opponent_player_name: trimOrNull(values.opponentPlayerName),
  my_partner_player_name: trimOrNull(values.myPartnerPlayerName),
  opponent_partner_player_name: trimOrNull(values.opponentPartnerPlayerName)
});

const fromDto = (dto: MatchRecordDto): MatchRecord => ({
  id: dto.id,
  createdAt: dto.created_at,
  playedAt: formatDatetimeLocal(dto.played_at),
  rule: dto.rule,
  stage: dto.stage,
  myScore: String(dto.my_score),
  opponentScore: String(dto.opponent_score),
  myCharacter: dto.my_character,
  myPartnerCharacter: dto.my_partner_character ?? "",
  opponentCharacter: dto.opponent_character,
  opponentPartnerCharacter: dto.opponent_partner_character ?? "",
  myRacket: dto.my_racket ?? "",
  myPartnerRacket: dto.my_partner_racket ?? "",
  opponentRacket: dto.opponent_racket ?? "",
  opponentPartnerRacket: dto.opponent_partner_racket ?? "",
  myRate: String(dto.my_rate),
  result: dto.result,
  myRateBand: dto.my_rate_band,
  myPartnerRateBand: dto.my_partner_rate_band ?? "",
  opponentRateBand: dto.opponent_rate_band,
  opponentPartnerRateBand: dto.opponent_partner_rate_band ?? "",
  opponentPlayerName: dto.opponent_player_name ?? "",
  myPartnerPlayerName: dto.my_partner_player_name ?? "",
  opponentPartnerPlayerName: dto.opponent_partner_player_name ?? ""
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`API接続に失敗しました: ${message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listRecords(): Promise<MatchRecord[]> {
  const data = await request<MatchRecordDto[]>("/records");
  return data.map(fromDto);
}

export async function createRecord(values: MatchRecordValues): Promise<MatchRecord> {
  const data = await request<MatchRecordDto>("/records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toPayload(values))
  });
  return fromDto(data);
}

export async function updateRecord(id: number, values: MatchRecordValues): Promise<MatchRecord> {
  const data = await request<MatchRecordDto>(`/records/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toPayload(values))
  });
  return fromDto(data);
}

export async function deleteRecord(id: number): Promise<void> {
  await request<void>(`/records/${id}`, {
    method: "DELETE"
  });
}
