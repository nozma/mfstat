import { useEffect, useMemo, useState } from "react";
import MatchRecordModal, {
  MatchRecordValues
} from "./components/MatchRecordModal";
import {
  MatchRecord,
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord
} from "./api/records";
import { RULE_OPTIONS } from "./constants/options";

function App() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editingRecord = useMemo(
    () => records.find((record) => record.id === editingRecordId),
    [records, editingRecordId]
  );
  const latestRecord = records[0];
  const createInitialValues = useMemo<Partial<MatchRecordValues> | undefined>(() => {
    if (!latestRecord) {
      return undefined;
    }

    return {
      rule: latestRecord.rule,
      stage: latestRecord.stage,
      myCharacter: latestRecord.myCharacter,
      myRacket: latestRecord.myRacket,
      myRate: latestRecord.myRate,
      myRateBand: latestRecord.myRateBand,
      opponentRateBand: latestRecord.opponentRateBand
    };
  }, [latestRecord]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const fetchedRecords = await listRecords();
        setRecords(fetchedRecords);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "記録の取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const openCreateModal = () => {
    setEditingRecordId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (id: number) => {
    setEditingRecordId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
  };

  const handleSubmit = async (values: MatchRecordValues) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (editingRecordId === null) {
        const createdRecord = await createRecord(values);
        setRecords((prev) => [createdRecord, ...prev]);
      } else {
        const updatedRecord = await updateRecord(editingRecordId, values);
        setRecords((prev) =>
          prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
        );
      }

      setIsModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }

    try {
      setDeletingRecordId(id);
      setErrorMessage(null);
      await deleteRecord(id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
      if (editingRecordId === id) {
        setEditingRecordId(null);
        setIsModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の削除に失敗しました。");
    } finally {
      setDeletingRecordId(null);
    }
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

      {errorMessage && <p className="status-message error">{errorMessage}</p>}

      <section className="record-list">
        <h2>記録一覧</h2>
        {isLoading ? (
          <p className="status-message">読み込み中...</p>
        ) : records.length === 0 ? (
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
                <div className="record-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => openEditModal(record.id)}
                    disabled={deletingRecordId === record.id}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => void handleDelete(record.id)}
                    disabled={deletingRecordId === record.id}
                  >
                    {deletingRecordId === record.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MatchRecordModal
        isOpen={isModalOpen}
        mode={editingRecord ? "edit" : "create"}
        initialValues={editingRecord}
        createInitialValues={createInitialValues}
        historyRecords={records}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

export default App;
