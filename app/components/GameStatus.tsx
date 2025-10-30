interface GameStatusProps {
  round: number;
  message?: string;
  logs?: string[];
}

export default function GameStatus({ round, message, logs = [] }: GameStatusProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Game Status</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
          <span className="font-semibold">Round:</span>
          <span className="text-2xl font-bold text-blue-600">{round}</span>
        </div>

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800">{message}</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-gray-700">Recent Actions:</h4>
            <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
              {logs.slice(-5).reverse().map((log, index) => (
                <p key={index} className="text-sm text-gray-600 py-1 border-b border-gray-200 last:border-0">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
