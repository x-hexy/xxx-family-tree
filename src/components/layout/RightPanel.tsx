import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useFamilyStore } from "../../store/useFamilyStore";
import type { Member, RelationType, Relationship } from "../../types/family";

type RightPanelProps = {
  readOnly?: boolean;
};

type MemberFormState = {
  name: string;
  title: string;
  birthYear: string;
  generation: string;
  bio: string;
  avatarUrl: string;
};

type RelationFormState = {
  fromMemberId: string;
  toMemberId: string;
  relationType: RelationType;
};

const relationLabels: Record<RelationType, string> = {
  parent: "父母",
  child: "子女",
  spouse: "配偶",
  sibling: "兄弟姐妹"
};

const emptyForm: MemberFormState = {
  name: "",
  title: "",
  birthYear: "",
  generation: "",
  bio: "",
  avatarUrl: ""
};

function toFormState(member: Member | null): MemberFormState {
  if (!member) return emptyForm;
  return {
    name: member.name,
    title: member.title ?? "",
    birthYear: member.birthYear ? String(member.birthYear) : "",
    generation: member.generation ? String(member.generation) : "",
    bio: member.bio ?? "",
    avatarUrl: member.avatarUrl ?? ""
  };
}

function relationDescription(
  relation: Relationship,
  memberMap: Map<string, string>,
  includeId = false
): string {
  const from = memberMap.get(relation.fromMemberId) ?? relation.fromMemberId;
  const to = memberMap.get(relation.toMemberId) ?? relation.toMemberId;
  const idPart = includeId ? `（${relation.id}）` : "";
  return `${from} -> ${relationLabels[relation.relationType]} -> ${to}${idPart}`;
}

export function RightPanel({ readOnly = false }: RightPanelProps) {
  const members = useFamilyStore((s) => s.members);
  const relationships = useFamilyStore((s) => s.relationships);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  const panelMode = useFamilyStore((s) => s.panelMode);
  const addMember = useFamilyStore((s) => s.addMember);
  const updateMember = useFamilyStore((s) => s.updateMember);
  const deleteMember = useFamilyStore((s) => s.deleteMember);
  const cancelCreateMember = useFamilyStore((s) => s.cancelCreateMember);
  const startCreateMember = useFamilyStore((s) => s.startCreateMember);
  const cancelRelationshipMode = useFamilyStore((s) => s.cancelRelationshipMode);
  const addRelationship = useFamilyStore((s) => s.addRelationship);
  const deleteRelationship = useFamilyStore((s) => s.deleteRelationship);
  const updateMemberAvatar = useFamilyStore((s) => s.updateMemberAvatar);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const [form, setForm] = useState<MemberFormState>(emptyForm);
  const [relationForm, setRelationForm] = useState<RelationFormState>({
    fromMemberId: "",
    toMemberId: "",
    relationType: "parent"
  });
  const [relationToDeleteId, setRelationToDeleteId] = useState<string>("");
  const [relationMessage, setRelationMessage] = useState<string>("");

  const isCreateMode = panelMode === "create" && !readOnly;
  const isCreateRelationMode = panelMode === "create_relationship" && !readOnly;
  const isDeleteRelationMode = panelMode === "delete_relationship" && !readOnly;
  const canEditSelected = !readOnly && !!selectedMember;

  useEffect(() => {
    if (panelMode === "create") {
      setForm(emptyForm);
      return;
    }
    setForm(toFormState(selectedMember));
  }, [panelMode, selectedMember]);

  useEffect(() => {
    if (!isCreateRelationMode) return;

    if (members.length < 2) {
      setRelationForm({ fromMemberId: "", toMemberId: "", relationType: "parent" });
      return;
    }

    const fromMemberId = selectedMemberId ?? members[0].id;
    const fallbackTo = members.find((m) => m.id !== fromMemberId)?.id ?? "";
    setRelationForm({
      fromMemberId,
      toMemberId: fallbackTo,
      relationType: "parent"
    });
    setRelationMessage("");
  }, [isCreateRelationMode, members, selectedMemberId]);

  useEffect(() => {
    if (!isDeleteRelationMode) return;
    setRelationToDeleteId(relationships[0]?.id ?? "");
    setRelationMessage("");
  }, [isDeleteRelationMode, relationships]);

  const updateField = (key: keyof MemberFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;

      setForm((prev) => ({ ...prev, avatarUrl: result }));
      if (selectedMember && panelMode !== "create") {
        updateMemberAvatar(selectedMember.id, result);
      }
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const submitCreate = () => {
    const name = form.name.trim();
    if (!name) return;

    addMember({
      name,
      title: form.title.trim() || undefined,
      birthYear: form.birthYear ? Number(form.birthYear) : undefined,
      generation: form.generation ? Number(form.generation) : undefined,
      bio: form.bio.trim() || undefined,
      avatarUrl: form.avatarUrl || undefined
    });
  };

  const submitUpdate = () => {
    if (!selectedMember) return;
    const name = form.name.trim();
    if (!name) return;

    updateMember(selectedMember.id, {
      name,
      title: form.title.trim() || undefined,
      birthYear: form.birthYear ? Number(form.birthYear) : undefined,
      generation: form.generation ? Number(form.generation) : undefined,
      bio: form.bio.trim() || undefined,
      avatarUrl: form.avatarUrl || undefined
    });
  };

  const submitCreateRelationship = () => {
    if (!relationForm.fromMemberId || !relationForm.toMemberId) {
      setRelationMessage("请先选择起点和终点成员。");
      return;
    }

    const result = addRelationship(relationForm);
    if (!result.ok) {
      setRelationMessage(result.reason);
      return;
    }
    setRelationMessage("关系已创建。");
  };

  const submitDeleteRelationship = () => {
    if (!relationToDeleteId) {
      setRelationMessage("请选择要删除的关系。");
      return;
    }
    deleteRelationship(relationToDeleteId);
    setRelationMessage("关系已删除。");
  };

  return (
    <aside className="scroll-frame w-72 border-l border-bronze/35 bg-[#f6efde]/85 p-4">
      <h2 className="mb-3 font-serifCn text-sm tracking-[0.14em] text-ink">
        {readOnly
          ? "成员详情"
          : isCreateMode
            ? "新增成员"
            : isCreateRelationMode
              ? "建立关系"
              : isDeleteRelationMode
                ? "删除关系"
                : "编辑面板"}
      </h2>

      {!readOnly && isCreateMode && (
        <div className="space-y-3 rounded border border-bronze/45 bg-parchment p-3 shadow-panel-soft">
          <p className="text-xs text-soot">填写成员信息后保存，系统会自动加入图谱。</p>
          <MemberForm form={form} onChange={updateField} onAvatarChange={handleAvatarUpload} />
          <div className="grid grid-cols-2 gap-2">
            <button className="tool-btn" onClick={submitCreate}>
              保存
            </button>
            <button className="tool-btn" onClick={cancelCreateMember}>
              取消
            </button>
          </div>
        </div>
      )}

      {!readOnly && isCreateRelationMode && (
        <div className="space-y-3 rounded border border-bronze/45 bg-parchment p-3 shadow-panel-soft">
          <p className="text-xs text-soot">先选择起点成员、关系类型，再选择终点成员。</p>
          {members.length < 2 ? (
            <p className="rounded border border-dashed border-bronze/35 p-2 text-xs text-soot">
              成员少于 2 人，暂时无法建立关系。请先新增成员。
            </p>
          ) : (
            <>
              <RelationCreateForm
                relationForm={relationForm}
                members={members}
                onChange={(patch) => setRelationForm((prev) => ({ ...prev, ...patch }))}
              />
              {relationMessage && (
                <p className="rounded border border-bronze/35 bg-[#fbf6ea] px-2 py-1 text-xs text-soot">
                  {relationMessage}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button className="tool-btn" onClick={submitCreateRelationship}>
                  保存
                </button>
                <button className="tool-btn" onClick={cancelRelationshipMode}>
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!readOnly && isDeleteRelationMode && (
        <div className="space-y-3 rounded border border-bronze/45 bg-parchment p-3 shadow-panel-soft">
          <p className="text-xs text-soot">选择已存在关系后删除。</p>
          {relationships.length === 0 ? (
            <p className="rounded border border-dashed border-bronze/35 p-2 text-xs text-soot">
              当前没有可删除的关系。
            </p>
          ) : (
            <>
              <label className="block text-xs text-soot">关系列表</label>
              <select
                value={relationToDeleteId}
                onChange={(event) => setRelationToDeleteId(event.target.value)}
                className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
              >
                {relationships.map((relation) => (
                  <option key={relation.id} value={relation.id}>
                    {relationDescription(relation, memberMap, true)}
                  </option>
                ))}
              </select>
              {relationMessage && (
                <p className="rounded border border-bronze/35 bg-[#fbf6ea] px-2 py-1 text-xs text-soot">
                  {relationMessage}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button className="tool-btn border-cinnabar text-cinnabar" onClick={submitDeleteRelationship}>
                  删除
                </button>
                <button className="tool-btn" onClick={cancelRelationshipMode}>
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!isCreateMode && !isCreateRelationMode && !isDeleteRelationMode && !selectedMember && (
        <p className="rounded border border-dashed border-bronze/35 p-3 text-sm text-soot">
          点击图谱节点后，在此处查看详细信息。
        </p>
      )}

      {!isCreateMode && !isCreateRelationMode && !isDeleteRelationMode && selectedMember && (
        <div className="space-y-3">
          <div className="rounded border border-bronze/45 bg-parchment p-3 shadow-panel-soft">
            <div className="mb-3 flex justify-center">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={form.name}
                  className="h-20 w-20 rounded-full border border-bronze/50 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-bronze/50 bg-[#e7dcc5] text-xs text-soot">
                  未上传
                </div>
              )}
            </div>

            {readOnly ? (
              <>
                <p className="text-center font-serifCn text-lg text-ink">{selectedMember.name}</p>
                <p className="text-center text-sm text-soot">{selectedMember.title ?? "家族成员"}</p>
                <p className="mt-2 text-center text-xs text-soot">
                  出生年: {selectedMember.birthYear ?? "未知"} | 代际: {selectedMember.generation ?? "未知"}
                </p>
                {selectedMember.bio && <p className="mt-2 text-sm text-soot">{selectedMember.bio}</p>}
              </>
            ) : (
              <>
                <MemberForm form={form} onChange={updateField} onAvatarChange={handleAvatarUpload} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="tool-btn" onClick={submitUpdate} disabled={!canEditSelected}>
                    保存
                  </button>
                  <button
                    className="tool-btn border-cinnabar text-cinnabar"
                    onClick={() => selectedMember && deleteMember(selectedMember.id)}
                    disabled={!canEditSelected}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!readOnly && !selectedMember && !isCreateMode && !isCreateRelationMode && !isDeleteRelationMode && (
        <button className="mt-3 tool-btn" onClick={startCreateMember}>
          或先新增成员
        </button>
      )}
    </aside>
  );
}

type MemberFormProps = {
  form: MemberFormState;
  onChange: (key: keyof MemberFormState, value: string) => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function MemberForm({ form, onChange, onAvatarChange }: MemberFormProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-soot">姓名</label>
      <input
        value={form.name}
        onChange={(event) => onChange("name", event.target.value)}
        className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      />

      <label className="block text-xs text-soot">称呼</label>
      <input
        value={form.title}
        onChange={(event) => onChange("title", event.target.value)}
        className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-soot">出生年</label>
          <input
            value={form.birthYear}
            onChange={(event) => onChange("birthYear", event.target.value)}
            className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
          />
        </div>
        <div>
          <label className="block text-xs text-soot">代际</label>
          <input
            value={form.generation}
            onChange={(event) => onChange("generation", event.target.value)}
            className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
          />
        </div>
      </div>

      <label className="block text-xs text-soot">简介</label>
      <textarea
        value={form.bio}
        onChange={(event) => onChange("bio", event.target.value)}
        className="h-16 w-full resize-none rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      />

      <label className="block text-xs text-soot">人物照片</label>
      <input
        type="file"
        accept="image/*"
        onChange={onAvatarChange}
        className="block w-full text-xs text-soot file:mr-3 file:rounded file:border file:border-bronze/45 file:bg-parchment file:px-3 file:py-1 file:text-xs file:text-soot hover:file:border-cinnabar hover:file:text-cinnabar"
      />
    </div>
  );
}

type RelationCreateFormProps = {
  relationForm: RelationFormState;
  members: Member[];
  onChange: (patch: Partial<RelationFormState>) => void;
};

function RelationCreateForm({ relationForm, members, onChange }: RelationCreateFormProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-soot">起点成员</label>
      <select
        value={relationForm.fromMemberId}
        onChange={(event) => onChange({ fromMemberId: event.target.value })}
        className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <label className="block text-xs text-soot">关系类型</label>
      <select
        value={relationForm.relationType}
        onChange={(event) => onChange({ relationType: event.target.value as RelationType })}
        className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      >
        {Object.entries(relationLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="block text-xs text-soot">终点成员</label>
      <select
        value={relationForm.toMemberId}
        onChange={(event) => onChange({ toMemberId: event.target.value })}
        className="w-full rounded border border-bronze/45 bg-[#fbf6ea] px-2 py-1 text-sm text-ink outline-none focus:border-cinnabar"
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
