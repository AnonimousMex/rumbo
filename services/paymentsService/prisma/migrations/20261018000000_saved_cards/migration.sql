-- CreateTable
CREATE TABLE "SavedCard" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "ultimos4" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "expiracion" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayVault" (
    "token" TEXT NOT NULL,
    "numeroCifrado" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayVault_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedCard_token_key" ON "SavedCard"("token");

-- CreateIndex
CREATE INDEX "SavedCard_clienteId_idx" ON "SavedCard"("clienteId");

