set shell := ["bash", "-cu"]

install:
	bun install

build:
	bun run build:packages

test:
	bun test

typecheck:
	bun run typecheck

format:
	bun run format
