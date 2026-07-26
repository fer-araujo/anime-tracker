export const metadata = {
  title: "Términos y Condiciones — Anime Tracker",
  description:
    "Términos y condiciones de uso de Anime Tracker, plataforma para descubrir y gestionar tu lista de animes.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Términos y Condiciones
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: <time dateTime="2026-07-26">26 de julio de 2026</time>
      </p>

      <section aria-labelledby="section-general">
        <h2 id="section-general" className="text-xl font-semibold mt-10 mb-4">
          1. Información General
        </h2>
        <p>
          Estos Términos y Condiciones rigen el uso de la plataforma Anime Tracker
          (en adelante, &quot;la Plataforma&quot;), un servicio web que permite a los
          usuarios descubrir, organizar y dar seguimiento a series de anime y sus
          plataformas de streaming disponibles.
        </p>
        <p>
          Al registrarte y utilizar la Plataforma, aceptas los presentes términos
          en su totalidad. Si no estás de acuerdo con alguno de ellos, deberás
          abstenerte de usar el servicio.
        </p>
      </section>

      <section aria-labelledby="section-service">
        <h2 id="section-service" className="text-xl font-semibold mt-10 mb-4">
          2. Descripción del Servicio
        </h2>
        <p>Anime Tracker ofrece las siguientes funcionalidades:</p>
        <ul>
          <li>Exploración de animes de temporada, populares y próximos estrenos.</li>
          <li>Creación de una lista personalizada de animes vistos, en progreso o pendientes.</li>
          <li>Marcado de animes como favoritos.</li>
          <li>Creación de colecciones personalizadas de animes.</li>
          <li>Visualización de las plataformas de streaming donde cada anime está disponible.</li>
        </ul>
        <p>
          La Plataforma no aloja, reproduce ni distribuye contenido audiovisual.
          Toda la información sobre animes y plataformas de streaming se obtiene
          de APIs de terceros (AniList y TMDB) y se presenta con fines informativos.
          Anime Tracker no garantiza la disponibilidad, exactitud o vigencia de
          dicha información.
        </p>
      </section>

      <section aria-labelledby="section-obligations">
        <h2 id="section-obligations" className="text-xl font-semibold mt-10 mb-4">
          3. Obligaciones del Usuario
        </h2>
        <p>Al utilizar la Plataforma, te comprometes a:</p>
        <ul>
          <li>Proporcionar información veraz, precisa y actualizada durante el registro.</li>
          <li>No utilizar la Plataforma para fines ilícitos o no autorizados.</li>
          <li>No intentar acceder a datos de otros usuarios, alterar el funcionamiento del servicio o realizar ingeniería inversa.</li>
          <li>No utilizar bots, scrapers u otros medios automatizados que puedan afectar el rendimiento de la Plataforma.</li>
          <li>Mantener la confidencialidad de tu cuenta y contraseña.</li>
        </ul>
      </section>

      <section aria-labelledby="section-account">
        <h2 id="section-account" className="text-xl font-semibold mt-10 mb-4">
          4. Registro y Terminación de Cuenta
        </h2>
        <p>
          Para acceder a ciertas funcionalidades es necesario crear una cuenta
          proporcionando un correo electrónico y un nombre de usuario. Eres
          responsable de toda actividad realizada desde tu cuenta.
        </p>
        <p>
          Nos reservamos el derecho de suspender o cancelar cuentas que violen
          estos términos, incluyendo —pero no limitado a— el uso abusivo del
          servicio, la provisión de información falsa o cualquier actividad que
          pueda dañar la Plataforma o a otros usuarios.
        </p>
        <p>
          Como usuario, puedes solicitar la eliminación de tu cuenta y datos
          asociados en cualquier momento contactándonos a través del correo
          electrónico indicado en la sección de contacto.
        </p>
      </section>

      <section aria-labelledby="section-ip">
        <h2 id="section-ip" className="text-xl font-semibold mt-10 mb-4">
          5. Propiedad Intelectual
        </h2>
        <p>
          El código, diseño, marcas y contenido original de Anime Tracker son
          propiedad de sus respectivos titulares. El nombre, imágenes, datos y
          metadatos de las series de anime mostradas en la Plataforma pertenecen
          a sus respectivos creadores, estudios y licenciatarios.
        </p>
        <p>
          Los datos de animes y plataformas de streaming se obtienen a través de
          las siguientes APIs de terceros, cada una sujeta a sus propios términos:
        </p>
        <ul>
          <li>
            <strong>AniList</strong> — API pública para datos de anime, manga y
            listas de usuarios.
          </li>
          <li>
            <strong>TMDB (The Movie Database)</strong> — API pública para
            metadatos audiovisuales.
          </li>
        </ul>
      </section>

      <section aria-labelledby="section-liability">
        <h2 id="section-liability" className="text-xl font-semibold mt-10 mb-4">
          6. Limitación de Responsabilidad
        </h2>
        <p>
          Anime Tracker actúa únicamente como un agregador de información. No
          somos propietarios ni tenemos control sobre el contenido de las series
          de anime ni sobre las plataformas de streaming listadas.
        </p>
        <p>
          La disponibilidad de las APIs de terceros (AniList, TMDB) está fuera de
          nuestro control. No garantizamos que el servicio esté disponible de
          forma ininterrumpida o libre de errores, ni que la información
          proporcionada sea completamente exacta o esté actualizada en todo
          momento.
        </p>
        <p>
          En la medida máxima permitida por la ley aplicable, Anime Tracker no
          será responsable por daños directos, indirectos, incidentales o
          consecuentes derivados del uso o la imposibilidad de uso del servicio.
        </p>
      </section>

      <section aria-labelledby="section-law">
        <h2 id="section-law" className="text-xl font-semibold mt-10 mb-4">
          7. Legislación Aplicable
        </h2>
        <p>
          Estos Términos y Condiciones se rigen por las leyes de los Estados
          Unidos Mexicanos. Cualquier controversia relacionada con el presente
          documento será sometida a la jurisdicción de los tribunales competentes
          en México.
        </p>
        <p>
          Para usuarios internacionales, Anime Tracker cumple además con los
          principios de protección de datos establecidos en el Reglamento General
          de Protección de Datos (GDPR) de la Unión Europea en lo aplicable.
        </p>
      </section>

      <section aria-labelledby="section-changes">
        <h2 id="section-changes" className="text-xl font-semibold mt-10 mb-4">
          8. Cambios a los Términos
        </h2>
        <p>
          Nos reservamos el derecho de modificar estos términos en cualquier
          momento. Los cambios serán notificados a través de la Plataforma o por
          correo electrónico. El uso continuado del servicio después de la
          publicación de cambios constituye la aceptación de los mismos.
        </p>
      </section>

      <section aria-labelledby="section-contact">
        <h2 id="section-contact" className="text-xl font-semibold mt-10 mb-4">
          9. Contacto
        </h2>
        <p>
          Si tienes preguntas sobre estos Términos y Condiciones, puedes
          contactarnos a través del siguiente correo electrónico:
        </p>
        <p className="text-primary font-medium">
          contacto@animetracker.com
        </p>
      </section>
    </article>
  );
}
