#!/bin/bash
PORT="${PORT:-5000}"

perl -e '
use Socket;
socket(S, PF_INET, SOCK_STREAM, 0) or die;
setsockopt(S, SOL_SOCKET, SO_REUSEADDR, 1);
setsockopt(S, SOL_SOCKET, 15, pack("l", 1));
bind(S, pack_sockaddr_in($ENV{PORT}||5000, INADDR_ANY)) or die;
listen(S, 128) or die;
$SIG{TERM} = sub { exit 0 };
while (accept(C, S)) {
  print C "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK";
  close C;
}
' &
PERL_PID=$!

PRELOAD_PID=$PERL_PID exec node ./dist/bootstrap.cjs
