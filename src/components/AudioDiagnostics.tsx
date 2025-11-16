import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Mic, Volume2, Wifi } from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  icon: typeof CheckCircle;
}

export const AudioDiagnostics = ({ onComplete }: { onComplete?: () => void }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'pass' | 'warning' | 'fail'>('idle');

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Verificar suporte a AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported');
      }
      const testContext = new AudioContextClass();
      await testContext.close();
      
      diagnostics.push({
        test: 'AudioContext',
        status: 'pass',
        message: 'Suporte a Web Audio API detectado',
        icon: CheckCircle,
      });
    } catch (error) {
      diagnostics.push({
        test: 'AudioContext',
        status: 'fail',
        message: 'Seu navegador não suporta Web Audio API',
        icon: XCircle,
      });
    }

    // Test 2: Verificar permissão de microfone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      diagnostics.push({
        test: 'Microfone',
        status: 'pass',
        message: 'Acesso ao microfone concedido',
        icon: Mic,
      });
    } catch (error) {
      diagnostics.push({
        test: 'Microfone',
        status: 'fail',
        message: 'Sem permissão para acessar o microfone',
        icon: XCircle,
      });
    }

    // Test 3: Verificar sample rate suportado
    try {
      const testContext = new AudioContext({ sampleRate: 48000 });
      const actualRate = testContext.sampleRate;
      await testContext.close();

      if (actualRate === 48000) {
        diagnostics.push({
          test: 'Sample Rate',
          status: 'pass',
          message: '48kHz suportado (ideal)',
          icon: CheckCircle,
        });
      } else {
        diagnostics.push({
          test: 'Sample Rate',
          status: 'warning',
          message: `Usando ${actualRate}Hz (funcional, mas não ideal)`,
          icon: AlertTriangle,
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Sample Rate',
        status: 'warning',
        message: 'Não foi possível testar sample rate',
        icon: AlertTriangle,
      });
    }

    // Test 4: Verificar latência
    try {
      const testContext = new AudioContext({ latencyHint: 'interactive' });
      const latency = testContext.baseLatency || 0;
      await testContext.close();

      if (latency < 0.02) {
        diagnostics.push({
          test: 'Latência',
          status: 'pass',
          message: `Latência baixa: ${(latency * 1000).toFixed(1)}ms`,
          icon: CheckCircle,
        });
      } else {
        diagnostics.push({
          test: 'Latência',
          status: 'warning',
          message: `Latência elevada: ${(latency * 1000).toFixed(1)}ms`,
          icon: AlertTriangle,
        });
      }
    } catch (error) {
      diagnostics.push({
        test: 'Latência',
        status: 'warning',
        message: 'Não foi possível medir latência',
        icon: AlertTriangle,
      });
    }

    // Test 5: Testar reprodução de áudio
    try {
      const testContext = new AudioContext();
      const oscillator = testContext.createOscillator();
      const gainNode = testContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(testContext.destination);
      gainNode.gain.value = 0.1;
      oscillator.frequency.value = 440;
      
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      oscillator.stop();
      await testContext.close();
      
      diagnostics.push({
        test: 'Reprodução',
        status: 'pass',
        message: 'Sistema de áudio funcionando',
        icon: Volume2,
      });
    } catch (error) {
      diagnostics.push({
        test: 'Reprodução',
        status: 'fail',
        message: 'Erro ao testar reprodução de áudio',
        icon: XCircle,
      });
    }

    // Test 6: Verificar conexão com internet
    if (navigator.onLine) {
      diagnostics.push({
        test: 'Conexão',
        status: 'pass',
        message: 'Conectado à internet',
        icon: Wifi,
      });
    } else {
      diagnostics.push({
        test: 'Conexão',
        status: 'fail',
        message: 'Sem conexão com internet',
        icon: XCircle,
      });
    }

    setResults(diagnostics);

    // Determinar status geral
    const hasFail = diagnostics.some(d => d.status === 'fail');
    const hasWarning = diagnostics.some(d => d.status === 'warning');
    
    if (hasFail) {
      setOverallStatus('fail');
    } else if (hasWarning) {
      setOverallStatus('warning');
    } else {
      setOverallStatus('pass');
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'fail':
        return 'text-red-600';
    }
  };

  const getOverallMessage = () => {
    switch (overallStatus) {
      case 'pass':
        return {
          title: '✅ Sistema pronto para uso',
          description: 'Todos os testes passaram com sucesso. Você pode iniciar a sessão de voz.',
          variant: 'default' as const,
        };
      case 'warning':
        return {
          title: '⚠️ Sistema funcional com avisos',
          description: 'O sistema deve funcionar, mas pode ter desempenho reduzido.',
          variant: 'default' as const,
        };
      case 'fail':
        return {
          title: '❌ Problemas detectados',
          description: 'Corrija os problemas antes de continuar.',
          variant: 'destructive' as const,
        };
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico de Áudio</CardTitle>
        <CardDescription>
          Verifique se seu sistema está pronto para sessões de voz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Executando diagnóstico...' : 'Iniciar Diagnóstico'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => {
              const Icon = result.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${getStatusColor(result.status)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{result.test}</span>
                      <Badge
                        variant={
                          result.status === 'pass' ? 'default' :
                          result.status === 'warning' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {result.status === 'pass' ? 'OK' :
                         result.status === 'warning' ? 'Aviso' :
                         'Erro'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {overallStatus !== 'idle' && (
          <Alert variant={getOverallMessage()?.variant}>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">{getOverallMessage()?.title}</p>
                <p className="text-sm">{getOverallMessage()?.description}</p>
                {overallStatus === 'pass' && onComplete && (
                  <Button onClick={onComplete} className="mt-2 w-full">
                    Continuar para Sessão de Voz
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'fail' && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">💡 Possíveis soluções:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Conceda permissão para microfone nas configurações do navegador</li>
              <li>• Use um navegador moderno (Chrome, Edge, Firefox, Safari)</li>
              <li>• Verifique sua conexão com internet</li>
              <li>• Tente usar fones de ouvido/headset</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
