import { v4 } from 'uuid';
import build from './app';
import plugin from '../src/index';
import { Member } from 'graasp';
import util from 'util';
import englishTranslations from '../src/lang/en.json';
import frenchTranslations from '../src/lang/fr.json';

const buildMember = (lang?: string) =>
  ({
    id: v4(),
    name: 'name',
    extra: { lang },
    email: 'email',
  } as unknown as Member);

const DEFAULT_LINK = 'link';
const DEFAULT_RE_REGISTRATION_ATTEMPT = false;

type Translations = { [key: string]: string };

// WARNING: might break if promisify is used once more for another function
const setupValidateSendMail = (translations: Translations, keyToCheck: string) => {
  jest.spyOn(util, 'promisify').mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (d: any) => {
      // check one translation in english
      expect(d.html).toContain(translations[keyToCheck]);
    };
  });
};

const setupValidateSendLoginMail = (t: Translations) => setupValidateSendMail(t, 'magiclink');
const setupValidateSendRegisterMail = (t: Translations) => setupValidateSendMail(t, 'greetings');

describe('Plugin Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Decorate fastify with mailer functions', async () => {
    const app = await build({ plugin });

    expect(app.mailer).toBeTruthy();
  });

  describe('sendLoginEmail', () => {
    it('Send login mail with default lang', async () => {
      setupValidateSendLoginMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(buildMember(), DEFAULT_LINK);
    });

    it('Send login mail with given lang', async () => {
      const lang = 'fr';
      setupValidateSendLoginMail(frenchTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(
        buildMember(lang),
        DEFAULT_LINK,
        DEFAULT_RE_REGISTRATION_ATTEMPT,
        lang,
      );
    });

    it('Send login mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendLoginMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(
        buildMember(lang),
        DEFAULT_LINK,
        DEFAULT_RE_REGISTRATION_ATTEMPT,
        lang,
      );
    });
  });

  describe('sendRegisterEmail', () => {
    it('Send register mail with default lang', async () => {
      setupValidateSendRegisterMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(), DEFAULT_LINK);
    });

    it('Send register mail with given lang', async () => {
      const lang = 'fr';
      setupValidateSendRegisterMail(frenchTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(lang), DEFAULT_LINK, lang);
    });

    it('Send register mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendRegisterMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(lang), DEFAULT_LINK, lang);
    });
  });
});
