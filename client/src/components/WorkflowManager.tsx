import { useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
  createSnapshot,
  downloadWorkflowJson,
  loadWorkflowFromStorage,
  parseWorkflowJson,
  saveWorkflowToStorage,
} from '../lib/workflowStorage';
import { templateToSnapshot, workflowTemplates } from '../lib/workflowTemplates';

interface Props {
  nodes: Node[];
  edges: Edge[];
  input: string;
  onLoad: (nodes: Node[], edges: Edge[], input?: string) => void;
}

export function WorkflowManager({ nodes, edges, input, onLoad }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSaveHint(msg);
    window.setTimeout(() => setSaveHint(null), 2000);
  };

  const handleExport = () => {
    downloadWorkflowJson(createSnapshot(nodes, edges, input));
    flash('已导出 JSON');
  };

  const handleImportClick = () => {
    setImportError(null);
    fileRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const snapshot = parseWorkflowJson(text);
      if (!snapshot) {
        setImportError('无效的 workflow JSON 文件');
        return;
      }
      onLoad(snapshot.nodes, snapshot.edges, snapshot.input);
      saveWorkflowToStorage(snapshot);
      flash(`已导入${snapshot.name ? `: ${snapshot.name}` : ''}`);
    } catch {
      setImportError('读取文件失败');
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = workflowTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const snapshot = templateToSnapshot(template);
    onLoad(snapshot.nodes, snapshot.edges, snapshot.input);
    saveWorkflowToStorage(snapshot);
    flash(`已加载: ${template.name}`);
  };

  const handleRestoreAutosave = () => {
    const saved = loadWorkflowFromStorage();
    if (!saved) {
      setImportError('没有本地缓存记录');
      return;
    }
    onLoad(saved.nodes, saved.edges, saved.input);
    flash('已恢复本地缓存');
  };

  const saved = loadWorkflowFromStorage();
  const savedLabel = saved
    ? new Date(saved.savedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="panel workflow-manager">
      <div className="panel-title-row">
        <h3>工作流</h3>
        {saveHint && <span className="workflow-save-hint">{saveHint}</span>}
      </div>
      <p className="panel-hint">模板 · 导入导出 · 恢复缓存</p>

      {savedLabel && <p className="workflow-autosave-meta">上次保存: {savedLabel}</p>}

      <div className="workflow-actions-row">
        <button type="button" className="btn-workflow" onClick={handleExport}>
          导出 JSON
        </button>
        <button type="button" className="btn-workflow" onClick={handleImportClick}>
          导入 JSON
        </button>
      </div>
      <button type="button" className="btn-workflow btn-workflow--wide" onClick={handleRestoreAutosave}>
        恢复本地
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="workflow-file-input"
        onChange={handleImportFile}
      />

      {importError && <p className="workflow-error">{importError}</p>}

      <div className="workflow-templates-title">演示模板</div>
      <div className="workflow-templates">
        {workflowTemplates.map((t) => (
          <button
            key={t.id}
            type="button"
            className="workflow-template-card"
            onClick={() => handleLoadTemplate(t.id)}
            title={t.description}
          >
            <span className="workflow-template-icon">{t.icon}</span>
            <span className="workflow-template-name">{t.name}</span>
            <span className="workflow-template-desc">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function autosaveWorkflow(nodes: Node[], edges: Edge[], input: string): void {
  if (nodes.length === 0) return;
  saveWorkflowToStorage(createSnapshot(nodes, edges, input));
}
