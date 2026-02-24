import { FormEvent, useEffect, useState } from "react";
import {
  CHARACTER_OPTIONS,
  RATE_BAND_OPTIONS,
  RACKET_OPTIONS,
  RULE_OPTIONS,
  RuleOption,
  SCORE_OPTIONS,
  STAGE_OPTIONS
} from "../constants/options";

export type MatchRecordValues = {
  playedAt: string;
  rule: RuleOption["value"];
  stage: string;
  myScore: string;
  opponentScore: string;
  myCharacter: string;
  myPartnerCharacter: string;
  opponentCharacter: string;
  opponentPartnerCharacter: string;
  myRacket: string;
  myPartnerRacket: string;
  opponentRacket: string;
  opponentPartnerRacket: string;
  myRate: string;
  myRateBand: string;
  opponentRateBand: string;
  opponentPlayerName: string;
  myPartnerPlayerName: string;
  opponentPartnerPlayerName: string;
};

type MatchRecordModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialValues?: MatchRecordValues;
  onClose: () => void;
  onSubmit: (values: MatchRecordValues) => void;
};

const defaultValues: MatchRecordValues = {
  playedAt: "",
  rule: RULE_OPTIONS[0].value,
  stage: STAGE_OPTIONS[0],
  myScore: SCORE_OPTIONS[0],
  opponentScore: SCORE_OPTIONS[0],
  myCharacter: CHARACTER_OPTIONS[0].value,
  myPartnerCharacter: CHARACTER_OPTIONS[0].value,
  opponentCharacter: CHARACTER_OPTIONS[1].value,
  opponentPartnerCharacter: CHARACTER_OPTIONS[2].value,
  myRacket: RACKET_OPTIONS[0],
  myPartnerRacket: RACKET_OPTIONS[0],
  opponentRacket: RACKET_OPTIONS[1],
  opponentPartnerRacket: RACKET_OPTIONS[1],
  myRate: "",
  myRateBand: RATE_BAND_OPTIONS[0],
  opponentRateBand: RATE_BAND_OPTIONS[0],
  opponentPlayerName: "",
  myPartnerPlayerName: "",
  opponentPartnerPlayerName: ""
};

const pad2 = (value: number) => value.toString().padStart(2, "0");

const getCurrentDatetimeLocalValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const buildCreateDefaults = (): MatchRecordValues => ({
  ...defaultValues,
  playedAt: getCurrentDatetimeLocalValue()
});

function MatchRecordModal({
  isOpen,
  mode,
  initialValues,
  onClose,
  onSubmit
}: MatchRecordModalProps) {
  const [values, setValues] = useState<MatchRecordValues>(buildCreateDefaults);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (mode === "edit" && initialValues) {
      setValues(initialValues);
      return;
    }
    setValues(buildCreateDefaults());
  }, [initialValues, isOpen, mode]);

  const selectedRule = RULE_OPTIONS.find((option) => option.value === values.rule) ?? RULE_OPTIONS[0];
  const isDoubles = selectedRule.isDoubles;
  const hasFeverRacket = selectedRule.hasFeverRacket;

  if (!isOpen) {
    return null;
  }

  const modalTitle = mode === "create" ? "記録を登録" : "記録を編集";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedValues: MatchRecordValues = { ...values };

    if (!isDoubles) {
      normalizedValues.myPartnerCharacter = "";
      normalizedValues.opponentPartnerCharacter = "";
      normalizedValues.myPartnerRacket = "";
      normalizedValues.opponentPartnerRacket = "";
      normalizedValues.myPartnerPlayerName = "";
      normalizedValues.opponentPartnerPlayerName = "";
    }

    if (!hasFeverRacket) {
      normalizedValues.myRacket = "";
      normalizedValues.opponentRacket = "";
      normalizedValues.myPartnerRacket = "";
      normalizedValues.opponentPartnerRacket = "";
    }

    onSubmit(normalizedValues);
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-record-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="match-record-modal-title">{modalTitle}</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>試合日時</span>
            <input
              type="datetime-local"
              value={values.playedAt}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  playedAt: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field">
            <span>ルール</span>
            <select
              value={values.rule}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  rule: event.target.value as RuleOption["value"]
                }))
              }
              required
            >
              {RULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>ステージ</span>
            <select
              value={values.stage}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  stage: event.target.value
                }))
              }
              required
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="grid-two">
            <label className="field">
              <span>スコア（自分）</span>
              <select
                value={values.myScore}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    myScore: event.target.value
                  }))
                }
                required
              >
                {SCORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>スコア（相手）</span>
              <select
                value={values.opponentScore}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    opponentScore: event.target.value
                  }))
                }
                required
              >
                {SCORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3 className="section-title">使用キャラ</h3>
          <div className="grid-two">
            <label className="field">
              <span>自分</span>
              <select
                value={values.myCharacter}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    myCharacter: event.target.value
                  }))
                }
                required
              >
                {CHARACTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>相手</span>
              <select
                value={values.opponentCharacter}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    opponentCharacter: event.target.value
                  }))
                }
                required
              >
                {CHARACTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isDoubles && (
            <div className="grid-two">
              <label className="field">
                <span>自分側パートナー</span>
                <select
                  value={values.myPartnerCharacter}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      myPartnerCharacter: event.target.value
                    }))
                  }
                  required
                >
                  {CHARACTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>相手側パートナー</span>
                <select
                  value={values.opponentPartnerCharacter}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      opponentPartnerCharacter: event.target.value
                    }))
                  }
                  required
                >
                  {CHARACTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {hasFeverRacket && (
            <>
              <h3 className="section-title">使用ラケット</h3>
              <div className="grid-two">
                <label className="field">
                  <span>自分</span>
                  <select
                    value={values.myRacket}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        myRacket: event.target.value
                      }))
                    }
                    required
                  >
                    {RACKET_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>相手</span>
                  <select
                    value={values.opponentRacket}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        opponentRacket: event.target.value
                      }))
                    }
                    required
                  >
                    {RACKET_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isDoubles && (
                <div className="grid-two">
                  <label className="field">
                    <span>自分側パートナー</span>
                    <select
                      value={values.myPartnerRacket}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myPartnerRacket: event.target.value
                        }))
                      }
                      required
                    >
                      {RACKET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>相手側パートナー</span>
                    <select
                      value={values.opponentPartnerRacket}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentPartnerRacket: event.target.value
                        }))
                      }
                      required
                    >
                      {RACKET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}

          <div className="grid-three">
            <label className="field">
              <span>自分のレート</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={values.myRate}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    myRate: event.target.value
                  }))
                }
                placeholder="例: 1540"
                required
              />
            </label>

            <label className="field">
              <span>自分のレート帯</span>
              <select
                value={values.myRateBand}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    myRateBand: event.target.value
                  }))
                }
                required
              >
                {RATE_BAND_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>相手のレート帯</span>
              <select
                value={values.opponentRateBand}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    opponentRateBand: event.target.value
                  }))
                }
                required
              >
                {RATE_BAND_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>相手プレイヤー名（任意）</span>
            <input
              type="text"
              value={values.opponentPlayerName}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  opponentPlayerName: event.target.value
                }))
              }
              placeholder="例: Rival01"
            />
          </label>

          {isDoubles && (
            <div className="grid-two">
              <label className="field">
                <span>自分側パートナー名（任意）</span>
                <input
                  type="text"
                  value={values.myPartnerPlayerName}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      myPartnerPlayerName: event.target.value
                    }))
                  }
                  placeholder="例: PartnerA"
                />
              </label>

              <label className="field">
                <span>相手側パートナー名（任意）</span>
                <input
                  type="text"
                  value={values.opponentPartnerPlayerName}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      opponentPartnerPlayerName: event.target.value
                    }))
                  }
                  placeholder="例: Rival02"
                />
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="button primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MatchRecordModal;
