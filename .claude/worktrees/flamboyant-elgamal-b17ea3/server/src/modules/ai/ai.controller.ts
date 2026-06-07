import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error';
import { aiService } from './ai.service';
import type { SrsInput } from './types';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export const aiController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    res.json(aiService.status());
  }),

  overview: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.overview(asString(req.body?.idea));
    res.json(result);
  }),

  requirements: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.requirements(asString(req.body?.source));
    res.json(result);
  }),

  review: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.review(asString(req.body?.text));
    res.json(result);
  }),

  refine: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.refine(asString(req.body?.stage), asString(req.body?.content));
    res.json(result);
  }),

  interview: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.interview(asString(req.body?.domain));
    res.json(result);
  }),

  istar: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.istar(asString(req.body?.requirement));
    res.json(result);
  }),

  generateUml: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.generateUml(
      asString(req.body?.description),
      asString(req.body?.diagramType),
    );
    res.json(result);
  }),

  renderUml: asyncHandler(async (req: Request, res: Response) => {
    const result = await aiService.renderUml(asString(req.body?.code));
    res.json(result);
  }),

  srs: asyncHandler(async (req: Request, res: Response) => {
    const input: SrsInput = {
      projectName: asString(req.body?.projectName),
      features: asStringArray(req.body?.features),
      background: asString(req.body?.background),
      material: asString(req.body?.material),
      supplement: req.body?.supplement === 'nonfunctional' ? 'nonfunctional' : undefined,
    };
    const result = await aiService.srs(input);
    res.json(result);
  }),
};
