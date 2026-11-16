'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';

interface DocumentsViewProps {
  projectId: string; // Può essere l'ID azienda o il codice azienda
}

export function DocumentsView({ projectId }: DocumentsViewProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading]  = useState(true);

  const fetchFiles = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Errore nel recupero dei file:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!projectId) {
        alert('Errore: ID Azienda/Progetto mancante.');
        return;
      }

      setUploading(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${projectId}/${Date.now()}_${sanitizedName}`;

      console.log('Avvio upload su bucket company-documents con path:', filePath);

      // 1. Upload sul bucket Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Dettaglio errore Storage:', uploadError);
        throw new Error(uploadError.message || JSON.stringify(uploadError));
      }

      // 2. Ottieni l'URL pubblico
      const { data: publicUrlData } = supabase.storage
        .from('company-documents')
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      // 3. Salva i metadati nella tabella company_files
      const { error: dbError } = await supabase
        .from('company_files')
        .insert([
          {
            project_id: projectId,
            file_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            file_type: file.type
          }
        ]);

      if (dbError) {
        console.error('Dettaglio errore Database:', dbError);
        throw new Error(dbError.message || JSON.stringify(dbError));
      }

      await fetchFiles();
      alert('Documento caricato e registrato con successo!');
    } catch (error: any) {
      console.error('Errore dettagliato durante l\'upload:', error);
      alert('Errore durante il caricamento: ' + (error.message || JSON.stringify(error)));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      const { error } = await supabase
        .from('company_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFiles(files.filter(f => f.id !== id));
    } catch (error: any) {
      console.error('Errore durante l\'eliminazione:', error.message);
      alert('Impossibile eliminare il file.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-950 border border-gray-800 p-4 rounded-xl shadow-lg">
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Archivio Documenti & Immagini</h3>
          <p className="text-[11px] text-gray-400">Gestione allegati, visure, contratti e file di supporto.</p>
        </div>
        <label className={`px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-md uppercase tracking-wider flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          {uploading ? 'Caricamento...' : '+ Upload Documento'}
          <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 min-h-[250px]">
        {loading ? (
          <div className="text-center py-12 text-xs text-gray-500">Caricamento documenti in corso...</div>
        ) : (
          files.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xs text-gray-400">Nessun documento caricato per questa azienda.</p>
              <p className="text-[11px] text-gray-600 mt-1">Clicca su Upload Documento in alto a destra per caricare file o immagini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-lg hover:border-gray-700 transition-all">
                  <div className="truncate pr-2">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-amber-300 hover:underline truncate block">
                      {file.file_name}
                    </a>
                    <span className="text-[10px] text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()} • {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDelete(file.id)}
                    className="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
