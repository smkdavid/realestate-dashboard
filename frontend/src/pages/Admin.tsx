import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface CollectorStatus {
  name: string
  last_run: string | null
  status: 'ok' | 'error' | 'running' | 'pending' | string
  rows_updated: number
}

const COLLECTOR_LABELS: Record<string, string> = {
  kb: 'KB 부동산 (xlsx)',
  ecos: '한국은행 ECOS',
  reb: '한국부동산원 API',
  molit: '국토교통부 API',
}

const DATA_NOTES: Record<string, string> = {
  kb: 'KB 데이터는 리브온(liiv.kbland.kr)에서 최신 xlsx 파일을 직접 다운로드 후 아래 업로드 폼으로 갱신하세요.',
  ecos: '한국은행 ECOS API 자동 수집. API 키: ECOS_API_KEY (.env)',
  reb: '한국부동산원 공공데이터포털 API. API 키 미설정 시 수집 불가.',
  molit: '국토교통부 공공데이터포털 API. API 키 미설정 시 수집 불가.',
}

export default function Admin() {
  const qc = useQueryClient()
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['collector-status'],
    queryFn: () => api.get('/admin/status').then(r => r.data),
    refetchInterval: 10000,
  })

  const triggerMutation = useMutation({
    mutationFn: (collector: string) => api.post(`/admin/trigger/${collector}`),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['collector-status'] }), 2000)
    },
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    onDrop: async (files) => {
      if (!files.length) return
      setUploading(true)
      setUploadMsg(null)
      const form = new FormData()
      form.append('file', files[0])
      try {
        const res = await api.post('/upload/kb', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        const d = res.data
        setUploadMsg(`✓ 업로드 완료: 가격 ${d.price_rows ?? 0}건 + 심리 ${d.sentiment_rows ?? 0}건 저장됨`)
        qc.invalidateQueries({ queryKey: ['kb-price'] })
        qc.invalidateQueries({ queryKey: ['kb-sentiment'] })
        refetchStatus()
      } catch (e: any) {
        const msg = e?.response?.data?.detail ?? '업로드 실패'
        setUploadMsg(`✗ ${msg}`)
      } finally {
        setUploading(false)
      }
    },
  })

  const statusColor = (s: string) => {
    if (s === 'ok') return 'text-green-400'
    if (s?.startsWith('error')) return 'text-red-400'
    if (s === 'running') return 'text-yellow-400'
    return 'text-muted-foreground'
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">데이터 관리 (관리자)</h1>

      {/* KB 데이터 업데이트 안내 */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader><CardTitle className="text-amber-400 text-sm">⚠ KB 데이터 업데이트 안내</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>현재 KB 데이터는 로컬 xlsx 파일 기준으로, <strong className="text-foreground">2023년 7월 10일</strong>까지의 데이터만 포함되어 있습니다.</p>
          <p>최신 데이터를 반영하려면:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>
              <a href="https://kbland.kr" target="_blank" rel="noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80">
                KB리브온 통계자료실
              </a>
              {' '}접속 → <em>KB부동산 데이터 차트.xlsx</em> 다운로드
            </li>
            <li>아래 업로드 영역에 파일을 드래그하거나 클릭하여 업로드</li>
            <li>업로드 완료 후 대시보드에서 최신 데이터 확인</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* KB 파일 업로드 */}
        <Card>
          <CardHeader><CardTitle>KB 부동산 xlsx 업로드</CardTitle></CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} />
              <p className="text-sm text-muted-foreground">
                {uploading ? '업로드 중...' : isDragActive ? 'xlsx 파일을 놓으세요' : 'KB 부동산 xlsx 파일을 드래그하거나 클릭하세요'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">*.xlsx 파일만 허용 (☆ 1-1. KB 부동산 데이터 차트.xlsx)</p>
            </div>
            {uploadMsg && (
              <p className={`mt-3 text-sm ${uploadMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {uploadMsg}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 수집 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              데이터 수집 현황
              <button
                onClick={() => triggerMutation.mutate('all')}
                className="text-xs px-3 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
              >
                전체 갱신
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="space-y-2">
                {status.map((s: CollectorStatus) => (
                  <div key={s.name} className="py-2 border-b border-border last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{COLLECTOR_LABELS[s.name] ?? s.name}</p>
                        <p className="text-xs text-muted-foreground">최근 실행: {formatDate(s.last_run)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${statusColor(s.status)}`}>
                          {s.status === 'ok' ? `✓ ${s.rows_updated}행` : s.status}
                        </span>
                        {s.name !== 'kb' && (
                          <button
                            onClick={() => triggerMutation.mutate(s.name)}
                            className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent transition-colors"
                          >
                            실행
                          </button>
                        )}
                      </div>
                    </div>
                    {s.status?.startsWith('error') && (
                      <p className="mt-1 text-xs text-red-400">{s.status}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{DATA_NOTES[s.name]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">상태 로딩 중...</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>스케줄러 정보</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">
            매일 오전 10:00 KST 자동 수집 — APScheduler CronTrigger(hour=10, minute=0)
          </p>
          <p className="text-sm text-muted-foreground">
            자동 수집 대상: 한국은행 ECOS (금리/M2/CPI) · 한국부동산원 · 국토부
          </p>
          <p className="text-sm text-muted-foreground">
            KB 데이터는 자동 수집 미지원 — xlsx 파일 수동 업로드 필요
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
