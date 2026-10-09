import { Response } from "express";
import { AuthedRequest } from "../../middleware/auth";
import { okBody } from "../../core/http";
import * as S from "./auth.service";

export async function register(req: AuthedRequest, res: Response) {
  const out = await S.register(req.body);
  res.cookie("refreshToken", out.refreshToken, S.refreshCookieOptions());
  res.status(201).json(okBody({ ...out.user, accessToken: out.accessToken }));
}

export async function login(req: AuthedRequest, res: Response) {
  const out = await S.login(req.body);
  res.cookie("refreshToken", out.refreshToken, S.refreshCookieOptions());
  res.json(okBody({ ...out.user, accessToken: out.accessToken }));
}

export async function logout(req: AuthedRequest, res: Response) {
  await S.logout(req.cookies?.refreshToken);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json(okBody({ ok: true }));
}

export async function refresh(req: AuthedRequest, res: Response) {
  const out = await S.refresh(req.cookies?.refreshToken);
  res.cookie("refreshToken", out.refreshToken, S.refreshCookieOptions());
  res.json(okBody({ accessToken: out.accessToken }));
}

export async function forgotPassword(req: AuthedRequest, res: Response) {
  await S.forgotPassword((req.body as { email: string }).email);
  res.json(okBody({ ok: true }));
}

export async function resetPassword(req: AuthedRequest, res: Response) {
  const { token, password } = req.body as { token: string; password: string };
  await S.resetPassword(token, password);
  res.json(okBody({ ok: true }));
}

export async function getMe(req: AuthedRequest, res: Response) {
  res.json(okBody(await S.me(req.userId!)));
}
