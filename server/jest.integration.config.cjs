// SDD-016 (G-03): config de Jest exclusiva para tests de integración contra
// PostgreSQL real (`*.integration.spec.ts`).
//
// Causa raíz que este harness corrige: bajo el paralelismo normal de Jest
// (~nproc-1 workers), múltiples archivos de integración pueden ejecutar
// transacciones `Serializable` al mismo tiempo desde procesos Node distintos.
// Eso no es una carrera del propio test — es contención real entre archivos
// no relacionados compitiendo por la misma instancia de Postgres, que hace
// que PostgreSQL aborte transacciones que en aislamiento habrían ganado
// limpiamente. Confirmado empíricamente: la suite completa falla ~83% de
// las veces en paralelo (Jest default) y 0% de las veces con un solo worker.
//
// `maxWorkers: 1` es explícito (no solo `--runInBand` en el script) para que
// la garantía de aislamiento no dependa de que quien invoque el comando
// recuerde el flag.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  maxWorkers: 1,
};
