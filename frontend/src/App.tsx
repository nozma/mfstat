import { useMemo, useState } from "react";
import MatchRecordModal, {
  MatchRecordValues
} from "./components/MatchRecordModal";
import { RULE_OPTIONS } from "./constants/options";

type MatchRecord = MatchRecordValues & {
  id: number;
};

const seedRecord: MatchRecord = {
  id: 1,
  playedAt: "2026-02-24T19:00",
  rule: "singles_fever_on",
  stage: "Stadium Court (Hard)",
  myScore: "6",
  opponentScore: "4",
  myCharacter: "Mario",
  myPartnerCharacter: "",
  opponentCharacter: "Luigi",
  opponentPartnerCharacter: "",
  myRacket: "Flame Racket",
  myPartnerRacket: "",
  opponentRacket: "Ice Racket",
  opponentPartnerRacket: "",
  myRate: "1540",
  myRateBand: "A",
  opponentRateBand: "A-",
  opponentPlayerName: "Rival01",
  myPartnerPlayerName: "",
  opponentPartnerPlayerName: ""
};

function App() {
  const [records, setRecords] = useState<MatchRecord[]>([seedRecord]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  const editingRecord = useMemo(
    () => records.find((record) => record.id === editingRecordId),
    [records, editingRecordId]
  );

  const openCreateModal = () => {
    setEditingRecordId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (id: number) => {
    setEditingRecordId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (values: MatchRecordValues) => {
    if (editingRecordId === null) {
      const nextId =
        records.length === 0
          ? 1
          : Math.max(...records.map((record) => record.id)) + 1;
      setRecords((prev) => [...prev, { id: nextId, ...values }]);
      setIsModalOpen(false);
      return;
    }

    setRecords((prev) =>
      prev.map((record) =>
        record.id === editingRecordId ? { ...record, ...values } : record
      )
    );
    setIsModalOpen(false);
  };

  const ruleLabelByValue = useMemo(
    () =>
      Object.fromEntries(RULE_OPTIONS.map((option) => [option.value, option.label])) as Record<
        MatchRecordValues["rule"],
        string
      >,
    []
  );

  return (
    <main className="app">
      <header className="page-header">
        <h1>MFStat</h1>
        <button type="button" className="button primary" onClick={openCreateModal}>
          記録を追加
        </button>
      </header>

      <section className="record-list">
        <h2>記録一覧（仮）</h2>
        {records.length === 0 ? (
          <p>まだ記録がありません。</p>
        ) : (
          <ul>
            {records.map((record) => (
              <li key={record.id} className="record-item">
                <div>
                  <p>
                    <strong>試合日時:</strong> {record.playedAt}
                  </p>
                  <p>
                    <strong>ルール:</strong> {ruleLabelByValue[record.rule]}
                  </p>
                  <p>
                    <strong>ステージ:</strong> {record.stage}
                  </p>
                  <p>
                    <strong>スコア:</strong> {record.myScore} - {record.opponentScore}
                  </p>
                  <p>
                    <strong>自分レート:</strong> {record.myRate} ({record.myRateBand})
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => openEditModal(record.id)}
                >
                  編集
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MatchRecordModal
        isOpen={isModalOpen}
        mode={editingRecord ? "edit" : "create"}
        initialValues={editingRecord}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

export default App;
