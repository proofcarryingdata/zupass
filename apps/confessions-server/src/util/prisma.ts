/* eslint-disable no-var */

import { PrismaClient } from "@prisma/client"

// This is to prevent prisma clients from accumulating during hot reloading
// https://github.com/prisma/prisma/issues/1983
// https://github.com/facebook/jest/issues/11640

declare global {
	var prisma: PrismaClient
}

function getPrismaClient() {
	if (process.env.NODE_ENV === "production") {
		return new PrismaClient()
	} else if (global.prisma instanceof PrismaClient) {
		return global.prisma
	} else {
		global.prisma = new PrismaClient()
		return global.prisma
	}
}

export const prisma = getPrismaClient()
