"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send, Smartphone, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { employeesApi, messagesApi, studentsApi, tenantsApi } from "@/lib/api-client";
import type {
  SchoolMessage,
  SchoolMessageAudience,
  SchoolMessageChannel,
} from "@/lib/schoolos-types";

const audienceLabels: Record<SchoolMessageAudience, string> = {
  parents: "Parents",
  teachers: "Teachers / staff",
  all: "Parents and teachers",
};

const channelLabels: Record<SchoolMessageChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function uniquePhoneCount(values: Array<string | null | undefined>) {
  return new Set(
    values
      .map((value) => value?.replace(/\D/g, ""))
      .filter((value): value is string => Boolean(value)),
  ).size;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not sent";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function messageExcerpt(message: SchoolMessage) {
  return message.body.length > 110 ? `${message.body.slice(0, 110)}...` : message.body;
}

export default function MessagesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const qc = useQueryClient();
  const [channel, setChannel] = useState<SchoolMessageChannel>("sms");
  const [audience, setAudience] = useState<SchoolMessageAudience>("parents");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const tenantQ = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantsApi.getBySlug(slug),
  });
  const tenantId = tenantQ.data?.tenant?.id;

  const messagesQ = useQuery({
    queryKey: ["school-messages", tenantId],
    queryFn: () => messagesApi.list(tenantId!),
    enabled: !!tenantId,
  });
  const studentsQ = useQuery({
    queryKey: ["students", tenantId, ""],
    queryFn: () => studentsApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });
  const employeesQ = useQuery({
    queryKey: ["employees", tenantId, ""],
    queryFn: () => employeesApi.list({ tenantId: tenantId! }),
    enabled: !!tenantId,
  });

  const recipientStats = useMemo(() => {
    const parentCount = uniquePhoneCount(
      (studentsQ.data?.students ?? [])
        .filter((student) => student.status === "enrolled")
        .map((student) => student.guardian_phone),
    );
    const teacherCount = uniquePhoneCount(
      (employeesQ.data?.employees ?? [])
        .filter((employee) => employee.status === "active")
        .map((employee) => employee.phone),
    );

    return {
      parents: parentCount,
      teachers: teacherCount,
      all: parentCount + teacherCount,
    };
  }, [employeesQ.data?.employees, studentsQ.data?.students]);

  const sendMut = useMutation({
    mutationFn: () =>
      messagesApi.send(tenantId!, {
        channel,
        audience,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: (data) => {
      toast.success(`Message sent to ${data.message.recipient_count} recipients`);
      qc.invalidateQueries({ queryKey: ["school-messages", tenantId] });
      setTitle("");
      setBody("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages = messagesQ.data?.messages ?? [];
  const selectedRecipientCount = recipientStats[audience];
  const canSend =
    !!tenantId && title.trim().length > 0 && body.trim().length > 0 && selectedRecipientCount > 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Messages
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">School communications</h1>
          <p className="mt-1 text-muted-foreground">
            Send SMS or WhatsApp updates to parents and teachers.
          </p>
        </div>
        <div className="flex gap-3">
          <Card className="min-w-32">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> Parents
              </div>
              <p className="mt-1 text-2xl font-semibold">{recipientStats.parents}</p>
            </CardContent>
          </Card>
          <Card className="min-w-32">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" /> Teachers
              </div>
              <p className="mt-1 text-2xl font-semibold">{recipientStats.teachers}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Create message</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recipients are pulled from enrolled students&apos; guardian numbers and active
                employees&apos; phone numbers.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(value) => setChannel(value as SchoolMessageChannel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={audience}
                  onValueChange={(value) => setAudience(value as SchoolMessageAudience)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="teachers">Teachers / staff</SelectItem>
                    <SelectItem value="all">Parents and teachers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-sm font-medium">{audienceLabels[audience]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedRecipientCount} phone {selectedRecipientCount === 1 ? "number" : "numbers"}{" "}
                ready for {channelLabels[channel]}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-title">Title</Label>
              <Input
                id="message-title"
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. PTA meeting reminder"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-body">Message</Label>
              <Textarea
                id="message-body"
                value={body}
                maxLength={2000}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the message parents or teachers should receive..."
                className="min-h-40"
              />
              <p className="text-xs text-muted-foreground">{body.length}/2000 characters</p>
            </div>

            <Button
              className="w-full bg-gradient-hero"
              disabled={!canSend || sendMut.isPending}
              onClick={() => sendMut.mutate()}
            >
              {sendMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send {channelLabels[channel]} message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-semibold">Sent messages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.length} {messages.length === 1 ? "message" : "messages"} recorded
                </p>
              </div>
              {messagesQ.isFetching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {messagesQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">No messages yet</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Sent SMS and WhatsApp messages will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="max-w-sm">
                        <div className="font-medium">{message.title}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {messageExcerpt(message)}
                        </div>
                      </TableCell>
                      <TableCell>{channelLabels[message.channel]}</TableCell>
                      <TableCell>{audienceLabels[message.audience]}</TableCell>
                      <TableCell>{message.recipient_count}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(message.sent_at ?? message.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          {message.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
