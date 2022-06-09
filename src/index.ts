import { promisify } from 'util';
import path from 'path';

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import pointOfView from 'point-of-view';
import * as eta from 'eta';
import fastifyPolyglot from 'fastify-polyglot';

import { Member } from 'graasp';
import { DEFAULT_LANG, DEFAULT_EXPORT_ACTIONS_VALIDITY_IN_DAYS } from './constants';

declare module 'fastify' {
  interface FastifyInstance {
    // remove once fastify-nodemailer has types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodemailer: any;
    // remove once point-of-view has the types fixed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any;
    // remove once fastify-polyglot has types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    i18n: any;
    mailer: {
      sendRegisterEmail: (member: Member, link: string, lang?: string) => Promise<void>;
      sendLoginEmail: (
        member: Member,
        link: string,
        reRegistrationAttempt?: boolean,
        lang?: string,
      ) => Promise<void>;
      sendExportActionsEmail: (
        member: Member,
        link: string,
        itemName: string,
        lang?: string,
        expirationDays?: number,
      ) => Promise<void>;
      sendInvitationEmail: (
        email: string,
        link: string,
        itemName: string,
        creatorName: string,
        lang?: string,
      ) => Promise<void>;
      sendPublishNotificationEmail: (
        member: Member,
        link: string,
        itemName: string,
        lang?: string,
      ) => Promise<void>;
    };
  }
}

export interface MailerOptions {
  host: string;
  username: string;
  password: string;
  fromEmail: string;
}

const plugin: FastifyPluginAsync<MailerOptions> = async (fastify, options) => {
  const { host, username: user, password: pass, fromEmail } = options;

  fastify.register(pointOfView, { engine: { eta } });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await fastify.register(require('fastify-nodemailer'), {
    host,
    auth: { user, pass },
    pool: true,
    port: 465,
    secure: true,
  });

  // we cannot use i18n.t in eta files
  // a solution to use plural/variable in translation is to pass the string directly
  fastify.register(fastifyPolyglot, {
    defaultLocale: DEFAULT_LANG,
    localesPath: path.join(__dirname, './lang'),
    debug: process.env.NODE_ENV !== 'production',
  });

  const promisifiedNodemailerSendMail =
    // sendMail() uses 'this' internally and 'promisify' breaks that, so it needs to be passed
    promisify(fastify.nodemailer.sendMail.bind(fastify.nodemailer));

  async function sendMail(from: string, to: string, subject: string, text: string, html?: string) {
    // TODO: does it make sense to return the return value of nodemailer?
    await promisifiedNodemailerSendMail({ from, to, subject, text, html });
  }

  const modulePath = module.path;

  // Login
  async function sendLoginEmail(
    member: { email: string; name: string },
    link: string,
    reRegistrationAttempt = false,
    lang = DEFAULT_LANG,
  ) {
    fastify.i18n.locale(lang);
    const translated = fastify.i18n.locales[lang] ?? fastify.i18n.locales[DEFAULT_LANG];
    const html = await fastify.view(`${modulePath}/templates/login.eta`, {
      member,
      link,
      reRegistrationAttempt,
      translated,
    });
    const title = translated['signInMailTitle'];
    await sendMail(fromEmail, member.email, title, link, html);
  }

  // Register
  async function sendRegisterEmail(
    member: { email: string; name: string },
    link: string,
    lang = DEFAULT_LANG,
  ) {
    fastify.i18n.locale(lang);
    const translated = fastify.i18n.locales[lang] ?? fastify.i18n.locales[DEFAULT_LANG];
    const html = await fastify.view(`${modulePath}/templates/register.eta`, {
      member,
      link,
      translated,
    });
    const title = translated['registrationMailTitle'];
    await sendMail(fromEmail, member.email, title, link, html);
  }

  // Invitation
  async function sendInvitationEmail(
    email: string,
    link: string,
    itemName: string,
    creatorName: string,
    lang = DEFAULT_LANG,
  ) {
    fastify.i18n.locale(lang);
    const translated = fastify.i18n.locales[lang] ?? fastify.i18n.locales[DEFAULT_LANG];
    // this line necessary for .t() to correctly use the changed locale
    fastify.i18n.replace(translated);
    const text = fastify.i18n.t('invitationText', {
      itemName,
      creatorName,
    });
    const html = await fastify.view(`${modulePath}/templates/invitation.eta`, {
      link,
      translated,
      text,
    });
    const title = translated['invitationMailTitle'];
    await sendMail(fromEmail, email, title, link, html);
  }

  // Download link for actions
  async function sendExportActionsEmail(
    member: { email: string; name: string },
    link: string,
    itemName: string,
    lang: string = DEFAULT_LANG,
    expirationDays: number = DEFAULT_EXPORT_ACTIONS_VALIDITY_IN_DAYS,
  ) {
    fastify.i18n.locale(lang);
    const translated = fastify.i18n.locales[lang] ?? fastify.i18n.locales[DEFAULT_LANG];
    // this line necessary for .t() to correctly use the changed locale
    fastify.i18n.replace(translated);
    const information = fastify.i18n.t('exportActionsInformation', {
      itemName,
      days: expirationDays,
    });

    const html = await fastify.view(`${modulePath}/templates/exportActions.eta`, {
      member,
      link,
      translated,
      information,
    });
    const title = fastify.i18n.t('exportActionsMailTitle', { itemName });
    await sendMail(fromEmail, member.email, title, link, html);
  }

  // Notification for publish an item
  async function sendPublishNotificationEmail(
    member: { email: string; name: string },
    link: string,
    itemName: string,
    lang = DEFAULT_LANG,
  ) {
    fastify.i18n.locale(lang);
    const translated = fastify.i18n.locales[lang] ?? fastify.i18n.locales[DEFAULT_LANG];
    const text = fastify.i18n.t('publishNotification', {
      itemName
    });
    const html = await fastify.view(`${modulePath}/templates/publishNotification.eta`, {
      member,
      text,
      translated,
    });
    const title = translated['publishNotificationTitle'];
    await sendMail(fromEmail, member.email, title, link, html);
  }

  fastify.decorate('mailer', {
    sendLoginEmail,
    sendRegisterEmail,
    sendExportActionsEmail,
    sendInvitationEmail,
    sendPublishNotificationEmail,
  });
};

export default fp(plugin, {
  fastify: '3.x',
  name: 'graasp-mailer',
});
