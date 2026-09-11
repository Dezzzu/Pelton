package autoconfig

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// a trimmed Thunderbird autoconfig document, shaped like the ones the ISPDB
// serves: pop3 is offered before imap, and the provider asks for OAuth2.
const oauthProviderXML = `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="example.com">
    <incomingServer type="pop3">
      <hostname>pop.example.com</hostname>
      <port>995</port>
      <socketType>SSL</socketType>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <incomingServer type="imap">
      <hostname>imap.example.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <authentication>OAuth2</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.example.com</hostname>
      <port>587</port>
      <socketType>STARTTLS</socketType>
      <authentication>OAuth2</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>`

func TestParseReadsTheImapAndSmtpServers(t *testing.T) {
	got, err := parse([]byte(oauthProviderXML), "ispdb")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}

	want := Discovered{
		IMAPHost: "imap.example.com",
		IMAPPort: 993,
		SMTPHost: "smtp.example.com",
		SMTPPort: 587,
		IMAPTLS:  "ssl",
		SMTPTLS:  "starttls",
		OAuth:    true,
		Source:   "ispdb",
	}
	if got != want {
		t.Errorf("parse() = %+v, want %+v", got, want)
	}
}

// A document that offers pop3 first must not leave the imap fields empty: the
// wizard would then fall through to a guessed host for a provider that told us
// the answer.
func TestParseSkipsNonImapIncomingServers(t *testing.T) {
	const popOnly = `<clientConfig><emailProvider>
	  <incomingServer type="pop3"><hostname>pop.example.com</hostname><port>995</port><socketType>SSL</socketType></incomingServer>
	</emailProvider></clientConfig>`

	got, err := parse([]byte(popOnly), "autoconfig")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if got.IMAPHost != "" {
		t.Errorf("IMAPHost = %q, want empty; a pop3 server is not an imap one", got.IMAPHost)
	}
}

func TestParseRejectsMalformedXML(t *testing.T) {
	if _, err := parse([]byte("<clientConfig><emailProvider>"), "ispdb"); err == nil {
		t.Error("parse of a truncated document returned no error")
	}
}

// socketTLS decides whether the wizard offers implicit TLS, STARTTLS or leaves
// the choice alone. Anything it does not recognize has to fall in the last
// group: returning "ssl" for an unknown value would claim a security level the
// document never stated, and returning something plaintext-shaped would hand
// the user a clear connection.
func TestSocketTLS(t *testing.T) {
	cases := []struct {
		socketType string
		want       string
	}{
		{"SSL", "ssl"},
		{"ssl", "ssl"},
		{"TLS", "ssl"},
		{"STARTTLS", "starttls"},
		{"starttls", "starttls"},
		{"plain", ""},
		{"PLAIN", ""},
		{"", ""},
		{"NONE", ""},
	}
	for _, c := range cases {
		if got := socketTLS(c.socketType); got != c.want {
			t.Errorf("socketTLS(%q) = %q, want %q", c.socketType, got, c.want)
		}
	}
}

func TestDomainOf(t *testing.T) {
	cases := []struct {
		email string
		want  string
	}{
		{"me@example.com", "example.com"},
		{"ME@EXAMPLE.COM", "example.com"},
		{"me@example.com ", "example.com"},
		{"first@second@example.com", "example.com"},
		{"me@", ""},
		{"example.com", ""},
		{"", ""},
	}
	for _, c := range cases {
		if got := domainOf(c.email); got != c.want {
			t.Errorf("domainOf(%q) = %q, want %q", c.email, got, c.want)
		}
	}
}

// The ISPDB is consulted before the domain's own documents, and both of the
// domain-hosted locations are tried, since servers publish one or the other.
func TestSourcesOrder(t *testing.T) {
	got := sources("example.com")
	if len(got) != 3 {
		t.Fatalf("sources() returned %d entries, want 3", len(got))
	}
	wantNames := []string{"ispdb", "autoconfig", "wellknown"}
	for i, name := range wantNames {
		if got[i].source != name {
			t.Errorf("sources()[%d].source = %q, want %q", i, got[i].source, name)
		}
		if !strings.HasPrefix(got[i].url, "https://") {
			t.Errorf("sources()[%d].url = %q, want an https url", i, got[i].url)
		}
		if !strings.Contains(got[i].url, "example.com") {
			t.Errorf("sources()[%d].url = %q, want the domain in it", i, got[i].url)
		}
	}
}

func TestFetchAndParseReadsAServedDocument(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/xml")
		_, _ = w.Write([]byte(oauthProviderXML))
	}))
	defer server.Close()

	got, err := fetchAndParse(context.Background(), server.Client(), server.URL, "wellknown")
	if err != nil {
		t.Fatalf("fetchAndParse: %v", err)
	}
	if got.IMAPHost != "imap.example.com" || got.Source != "wellknown" {
		t.Errorf("fetchAndParse() = %+v, want the served imap host tagged wellknown", got)
	}
}

// A domain that serves a 404 html page for every path is the common case for
// the .well-known location. Treating that as a config would poison the wizard
// with whatever the page happened to contain.
func TestFetchAndParseRejectsANonOKResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "not found", http.StatusNotFound)
	}))
	defer server.Close()

	if _, err := fetchAndParse(context.Background(), server.Client(), server.URL, "wellknown"); err == nil {
		t.Error("fetchAndParse of a 404 returned no error")
	}
}
